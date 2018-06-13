"use strict";

var nasToWei = new BigNumber(10).pow(new BigNumber(18));
var initPokerList = [["heart","hide"],["heart","hide"],["heart","hide"]];

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
        fee: null,
        size: null, // 竞猜项目总数
        historySize: null // 已结束项目数
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
        historyDeskKeys: null, // Index: true (Index => size)
        nickNameMap: null
    });
};

ZJHContract.prototype = {
    init: function () {
        this.owner = Blockchain.transaction.from;
        this.fee = new BigNumber(0.001);
        this.size = 0;
        this.historySize = 0;
    },
    // 发起牌局 下注单位 玩家人数 口号
    createDesk: function (deskUnits, playCount, slogan, nickName, createTime) {
        var from = Blockchain.transaction.from;
        var value = new BigNumber(Blockchain.transaction.value);
        // 下注单位
        var deskUnits = new BigNumber(deskUnits);
        var deskUnitsWei = deskUnits.times(nasToWei)
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
        playItem.pokerList= initPokerList;
        playItem.winStatus = 0;
        playItem.nickName = nickName;
        playItem.createTime =createTime;

        deskItem.playList = [playItem];
        deskItem.nickName = nickName;
        deskItem.createTime = createTime;
        this.nickNameMap.set(from, nickName);
        this.allDeskMap.set(this.size, deskItem);
        this.size += 1;
    },

    // 参与
    joinDesk: function (deskIndex,nickName,createTime) {
        var from = Blockchain.transaction.from;
        var value = new BigNumber(Blockchain.transaction.value);
        deskIndex = new BigNumber(deskIndex);
        var deskItem = this.allDeskMap.get(deskIndex);
        //交易桌号状态
        this._validDesk(deskItem);
        var deskUnits = new BigNumber(deskItem.deskUnits);
        var deskUnitsWei = deskUnits.times(nasToWei)
        if (!value.eq(deskUnitsWei)) {
            throw new Error("Please pay " + deskUnits.div(nasToWei) + "NAS.");
        }
        var playItem = new PlayItem();
        playItem.userAddress = from;
        playItem.pokerList= initPokerList;
        playItem.winStatus = 0;
        playItem.nickName = nickName;
        playItem.createTime = createTime;
        deskItem.playList.push(playItem);
        if (deskItem.playList.length == deskItem.playCount) {
            // 人数满了 发牌 结算
            var playList = deskItem.playList;
            //发牌
            playList = this._dealPoker(playList);
            //开奖
            var winnerPlay = this._openPoker(playList);
            var winFee = deskUnits.times(deskItem.playCount);
            // 支付奖金
            var result = Blockchain.transfer(winnerPlay.userAddress, winFee);
            if (!result) {
                throw new Error("transfer failed.");
            }
            Event.Trigger("ZJHContract", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: winnerPlay.userAddress,
                    value: winFee.toString()
                }
            });
            var historyIndex = this.historySize;
            this.historyIndexMap.set(historyIndex, deskItem.index);
            this.historyDeskKeys.set(deskItem.index, true);
            this.nickNameMap.set(from, nickName);
            for (var i = 0; i < playList.length; i++) {
                if (playList[i].userAddress == winnerPlay.userAddress) {
                    playList[i].winFee = winFee;
                    playList[i].winStatus = 1;
                }else
                {
                    playList[i].winFee = 0;
                    playList[i].winStatus = 2;
                }
            }
            deskItem.playList = playList;
        }
        this.allDeskMap.set(deskIndex, deskItem);
    },

    // get current
    getCurrentDesk: function () {
        var deskList = [];
        for (var i = 0; i < this.size; i++) {
            if (!this.historyDeskKeys.get(i)) {
                var guessItem = this.allDeskMap.get(i);
                deskList.push(guessItem);
            }
        }

        return deskList;
    },

    // get history
    getHistory: function (len) {
        len = parseInt(new BigNumber(len));
        var deskList = [];
        for (var i = 0; i < len; i++) {
            var index = this.historyIndexMap.get(this.historySize - 1 - i);
            var deskItem = this.allDeskMap.get(index);
            if (deskItem) {
                deskList.push(deskItem);
            }
        }

        return beRewardGuess;
    },

    getNickName: function (fromAddress) {
        return this.nickNameMap.get(fromAddress);
    },
    _validDesk: function (deskItem) {
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
    },
    test: function () {
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

    setOwner: function (address) {
        this._verifyAddress(address);

        var from = Blockchain.transaction.from;
        this._isOwner(from);

        this.owner = address;
    },

    setFee: function (fee) {
        fee = new BigNumber(fee);
        var from = Blockchain.transaction.from;
        this._isOwner(from);

        this.fee = fee;
    },
    getFee: function () {
        return this.fee;
    },

    setUnit: function (unit) {
        unit = new BigNumber(unit);
        var from = Blockchain.transaction.from;
        this._isOwner(from);

        this.unit = unit.times(nasToWei);
    },
    getUnit: function () {
        return new BigNumber(this.unit).div(nasToWei);
    },

    setGuessUnits: function (guessUnits) {
        guessUnits = new BigNumber(guessUnits)
        var from = Blockchain.transaction.from;
        this._isOwner(from);

        this.guessUnits = guessUnits;
    },
    getGuessUnits: function () {
        return this.guessUnits;
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
        var pokerNum = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14"];  //点数
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