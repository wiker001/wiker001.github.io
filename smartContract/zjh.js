"use strict";

var nasToWei = new BigNumber(10).pow(new BigNumber(18));
var initPokerList = [["hearts", "hide"], ["hearts", "hide"], ["hearts", "hide"]];

var PlayItem = function (text) {
    if (text) {
        var obj = JSON.parse(text);
        this.userAddress = obj.userAddress; //user地址
        this.pokerList = obj.pokerList;
        this.winStatus = obj.winStatus;// 输赢状态
        this.winFee = obj.winFee; //获胜金额
        this.nickName = obj.nickName;
        this.createTime = obj.createTime;
    } else {
        this.userAddress = "";
        this.pokerList = [];
        this.winStatus = 0;
        this.winFee = new BigNumber(0);
        this.createTime = "";
        this.nickName = "";
    }
}

PlayItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var DeskItem = function (text) {
    if (text) {
        var obj = JSON.parse(text);
        this.index = obj.index;
        this.from = obj.from; //发起者
        this.deskUnits = obj.deskUnits; //牌局下注单位
        this.playCount = obj.playCount; // 开牌人数
        this.playList = obj.playList; // 玩家列表
        this.deskStatus = obj.deskStatus;
        this.nickName = obj.nickName;
        this.slogan = obj.slogan;
        this.createTime = obj.createTime;
    } else {
        this.index = "";
        this.from = "";
        this.deskUnits = new BigNumber(0.01);
        this.playCount = 2;
        this.playList = [];
        this.deskStatus = true
        this.slogan = "";
        this.nickName = "";
        this.createTime = "";
    }
};

DeskItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};


var ZJHContract = function () {
    LocalContractStorage.defineProperties(this, {
        owner: null,
        percentFee: null,
        size: null, // 总桌数
        historySize: null, // 已结束桌数
        currentSize: null
    });

    LocalContractStorage.defineMapProperty(this, "allDeskMap", {
        parse: function (text) {
            return new DeskItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });

    LocalContractStorage.defineMapProperties(this, {
        historyIndexMap: null, // index: Index (index => beRewardSize)
        currentIndexMap: null, // Index: true (Index => size)
        nickNameMap: null
    });
};

ZJHContract.prototype = {
    init: function () {
        this.owner = Blockchain.transaction.from;
        this.size = 0;
        this.percentFee = new BigNumber(0.05);
        this.historySize = 0;
        this.currentSize = 0;
    },
    // 发起牌局 下注单位 玩家人数 口号
    createDesk: function (deskUnits, playCount, slogan, nickName, createTime) {
        var from = Blockchain.transaction.from;
        var value = new BigNumber(Blockchain.transaction.value);
        // 下注单位
        var deskUnits = new BigNumber(deskUnits);
        var deskUnitsWei = deskUnits.times(nasToWei);
        playCount = parseInt(playCount);
        // 创建者 支付金额和 下注单位金额一致
        if (!value.eq(deskUnitsWei)) {
            throw new Error("Please pay " + deskUnits.div(nasToWei) + "NAS.");
        }
        var deskItem = new DeskItem();
        deskItem.index = this.size;
        deskItem.from = from;
        deskItem.deskUnits = deskUnits;
        deskItem.playCount = playCount;
        deskItem.slogan = slogan;
        var playItem = new PlayItem();
        playItem.userAddress = from;
        playItem.pokerList = initPokerList;
        playItem.winStatus = 0;
        playItem.nickName = nickName;
        playItem.createTime = createTime;

        deskItem.playList = [playItem];
        deskItem.nickName = nickName;
        deskItem.createTime = createTime;
        this.nickNameMap.set(from, nickName);
        this.allDeskMap.set(this.size, deskItem);
        this.currentIndexMap.set(this.currentSize, this.size);
        this.size += 1;
        this.currentSize += 1;
    },

    // 参与
    joinDesk: function (deskIndex, nickName, createTime) {
        var from = Blockchain.transaction.from;
        var value = new BigNumber(Blockchain.transaction.value);
        deskIndex = new BigNumber(deskIndex);
        var deskItem = this.allDeskMap.get(deskIndex);
        //交易桌号状态
        this._validDesk(deskItem, from);
        var deskUnits = new BigNumber(deskItem.deskUnits);
        var deskUnitsWei = deskUnits.times(nasToWei)
        if (!value.eq(deskUnitsWei)) {
            throw new Error("Please pay " + deskUnits + "NAS.");
        }
        var playItem = new PlayItem();
        playItem.userAddress = from;
        playItem.pokerList = initPokerList;
        playItem.winStatus = 0;
        playItem.nickName = nickName;
        playItem.createTime = createTime;
        deskItem.playList.push(playItem);
        var openIndex = -1;
        if (deskItem.playList.length == deskItem.playCount) {
            // 人数满了 发牌 结算
            var playList = deskItem.playList;
            //发牌
            playList = this._dealPoker(playList);
            //开奖
            var winnerPlay = this._openPoker(playList);
            var winFee = deskUnitsWei.times(deskItem.playCount);
            // 千分之一旷工费
            var minusFee = new BigNumber(1).minus(new BigNumber(this.percentFee));
            winFee = winFee.times(minusFee);
            // 支付奖金
            var result = Blockchain.transfer(winnerPlay.userAddress, winFee);
            if (!result) {
                throw new Error("transfer failed." + winFee);
            }
            Event.Trigger("ZJHContract", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: winnerPlay.userAddress,
                    value: winFee.toString()
                }
            });
            var historyIndex = this.historySize;
            this._resetCurrentIndexMap(deskIndex);
            this.historyIndexMap.set(historyIndex, deskItem.index);
            this.nickNameMap.set(from, nickName);
            for (var i = 0; i < playList.length; i++) {
                if (playList[i].userAddress == winnerPlay.userAddress) {
                    playList[i].winFee = winFee.div(nasToWei);
                    playList[i].winStatus = 1;
                } else {
                    playList[i].winFee = 0;
                    playList[i].winStatus = 2;
                }
            }
            deskItem.playList = playList;
            this.historySize += 1;
            this.currentSize -= 1;
            openIndex = deskIndex;
        }
        this.allDeskMap.set(deskIndex, deskItem);
        return openIndex;
    },
    _resetCurrentIndexMap: function (deskIndex) {
        var delIndex = this.currentSize;
        for (var i = 0; i < this.currentSize; i++) {
            var itemDeskIndex = this.currentIndexMap.get(i);
            if (itemDeskIndex == deskIndex) {
                delIndex = i;
                this.currentIndexMap.delete(delIndex);
            }
            if (i > delIndex) {
                this.currentIndexMap.set(i - 1, itemDeskIndex);
            }
        }
    },
    // get current
    getCurrentDesk: function (limit, offset) {
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (this.currentSize != 0 && offset > this.currentSize) {
            throw new Error("offset is not valid");
        }
        var number = this.currentSize - offset - limit;
        var start = this.currentSize - offset;
        if (number < 0) {
            number = -1;
        }
        var resultData = {};
        var deskList = [];
        for (var i = start; i > number; i--) {
            var itemDeskIndex = this.currentIndexMap.get(i);
            if (itemDeskIndex > -1) {
                var currentItem = this.allDeskMap.get(itemDeskIndex);
                deskList.push(currentItem);
            }
        }
        resultData.data = deskList;
        resultData.count = this.currentSize;
        return resultData;
    },

    // get history
    getHistory: function (limit, offset) {
        limit = parseInt(limit);
        offset = parseInt(offset);
        if (this.historySize != 0 && offset > this.historySize) {
            throw new Error("offset is not valid");
        }
        var number = this.historySize - offset - limit;
        var start = this.historySize - offset;
        if (number < 0) {
            number = -1;
        }
        var resultData = {};
        var deskList = [];
        for (var i = start; i > number; i--) {
            var itemDeskIndex = this.historyIndexMap.get(i);
            if (itemDeskIndex > -1) {
                var currentItem = this.allDeskMap.get(itemDeskIndex);
                deskList.push(currentItem);
            }
        }
        resultData.data = deskList;
        resultData.count = this.historySize;
        return resultData;
    },
    getNickName: function (fromAddress) {
        return this.nickNameMap.get(fromAddress);
    },
    _validDesk: function (deskItem, from) {
        if (!deskItem) {
            throw new Error("this desk not exist");
        }
        if (!deskItem.deskStatus) {
            throw new Error("this desk game is over");
        }
        var playList = deskItem.playList;
        var playCount = deskItem.playCount;
        if (playList.length == playCount) {
            throw new Error("this desk play enough");
        }
        if (playList.length > 0) {
            for (var i = 0; i < playList.length; i++) {
                var playItem = playList[i];
                if (playItem.userAddress === from) {
                    throw new Error("duplicate join");
                }
            }
        }
    },
    setFee: function (percentFee) {
        percentFee = new BigNumber(percentFee);
        var from = Blockchain.transaction.from;
        this._isOwner(from);

        this.percentFee = percentFee;
    },
    getFee: function () {
        return this.percentFee;
    },
    _isOwner: function (address) {
        if (!(address === this.owner)) {
            throw new Error("Unauthorized operation!");
        }
    },

    _verifyAddress: function (address) {
        var valid = Blockchain.verifyAddress(address);
        if (!valid) {
            throw new Error("Invalid address!");
        }
    },

    withdraw: function (address, value) {
        value = new BigNumber(value);

        this._verifyAddress(address);

        var from = Blockchain.transaction.from;
        this._isOwner(from);

        // 转账提款
        var result = Blockchain.transfer(address, value.times(nasToWei));
        if (!result) {
            throw new Error("transfer failed.");
        }
        Event.Trigger("ZJHContract", {
            Transfer: {
                from: Blockchain.transaction.to,
                to: address,
                value: value.toString()
            }
        });
    },

    //发牌
    _dealPoker: function (playList) {
        //构建牌组
        var pokerColor = ["clubs", "hearts", "spade", "diamonds"]; //花色
        var pokerNum = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];  //点数
        var pokerArray = [];
        var k = 0;
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 13; j++) {
                pokerArray[k] = [pokerColor[i], pokerNum[j]]; //含有52张牌的二维数组
                k++;
            }
        }
        //需要分发 人数 *3 张牌
        var dealNum = playList.length * 3;
        var pokerList = [];
        var playIndex = 0;
        for (i = 0; i < dealNum; i++) {
            var cordnum = Math.ceil(Math.random() * (51 - i));
            pokerList.push(pokerArray[cordnum]);
            if (i % 3 == 2) {
                playList[playIndex].pokerList = pokerList;
                pokerList = [];
                playIndex++;
            }
            pokerArray.splice(cordnum, 1);
        }
        return playList;
    },
    //开牌
    _openPoker: function (playList) {
        var winnerPlayer = playList[0];
        var winnerWeight = 0;
        for (var i = 0; i < playList.length; i++) {
            var weight = this._calWeight(playList[i].pokerList[0], playList[i].pokerList[1], playList[i].pokerList[2]);
            if (weight > winnerWeight) {
                winnerPlayer = playList[i];
                winnerWeight = weight;
            }
        }
        return winnerPlayer;
    },
    //计算玩家牌的权值
    _calWeight: function (poker1, poker2, poker3) {
        var play_num = new Array(poker1[1], poker2[1], poker3[1]);//将电脑牌的数字部分存入数组
        play_num = play_num.sort();//将电脑牌的数字部分排序
        var play_val = 0;//初始化权值
        if (play_num[0] == play_num[1] && play_num[1] == play_num[2]) {	//判断是否为暴子
            play_val += 3 * 1e8;
        }
        if (Number(play_num[1]) - Number(play_num[0]) == 1 && Number(play_num[2]) - Number(play_num[1]) == 1) {		//判断是否为顺子
            play_val += 2 * 1e8;
        }
        if (poker1[0] == poker2[0] && poker2[0] == poker3[0]) {	//判断是否为清一色
            play_val += 1e8;
        }
        if (play_num[0] == play_num[1] || play_num[1] == play_num[2]) {		//判断是否为对子
            play_val += 1e7;
            var tem = "";
            tem = play_num[2];
            play_num[2] = play_num[1];
            play_num[1] = tem;
        }
        play_val += Number(play_num.reverse().join(""));		//计算玩家牌的最终权值
        return play_val;
    }
};

module.exports = ZJHContract;