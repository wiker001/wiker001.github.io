//构建牌组
var cords = [];
var arrcolor = ["clubs", "hearts", "spade", "diamonds"]; //花色
var arrnum = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14"];  //点数
var k = 0;
for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 13; j++) {
        cords[k] = [arrcolor[i], arrnum[j]]; //含有52张牌的二维数组
        k++;
    }
}

var randcords = [];
for (i = 0; i < 9; i++) {
    var cordnum = Math.ceil(Math.random() * (51 - i));
    randcords[i] = cords[cordnum];
    cords.splice(cordnum, 1);
}


function calWeight(poker1, poker2, poker3) {
//计算电脑牌的权值
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

var p1 = calWeight(['hearts', '03'],
    ['spade', '03'],
    ['diamonds', '03']);

var p2 = calWeight(['hearts', '05'],
    ['hearts', '14'],
    ['hearts', '07']);


var PlayItem = function (text) {
    if (text) {
        var obj = JSON.parse(text);
        this.userAddress = obj.userAddress; //user地址
        this.pokerList = obj.pokerList;
        this.winStatus = obj.winStatus;// 输赢状态
        this.winFee = obj.winFee; //获胜金额
    } else {
        this.userAddress = "";
        this.pokerList = [];
        this.winStatus = false;
        this.winFee = 0;
    }
};

var playList = [];
for (var i = 0; i < 15; i++) {
    var play = new PlayItem();
    play.userAddress = "user" + i;
    playList.push(play);
}

playList = _dealPoker(playList);
console.log(JSON.stringify(playList))
var winPlay = _openPoker(playList);
console.log(JSON.stringify(winPlay))


//发牌
function _dealPoker(playList) {
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
};

//开牌
function _openPoker(playList) {
    var winnerPlayer = playList[0];
    var winnerWeight = 0;
    for (var i = 0; i < playList.length; i++) {
        var weight = _calWeight(playList[i].pokerList[0], playList[i].pokerList[1], playList[i].pokerList[2]);
        if (weight > winnerWeight) {
            winnerPlayer = playList[i];
            winnerWeight = weight;
        }
    }
    return winnerPlayer;
};

//计算玩家牌的权值
function _calWeight(poker1, poker2, poker3) {
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



