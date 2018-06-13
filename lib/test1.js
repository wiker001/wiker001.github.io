var ScoreItem = function (text) {
    if (text) {
        var obj = JSON.parse(text);
        this.score = obj.score;
        this.scoreAddress = obj.scoreAddress;
    } else {
        this.score = 5;
        this.scoreAddress = "";
    }
};
var list = [];
var scoreItem1 = new ScoreItem();
scoreItem1.score = 5;
var scoreItem2= new ScoreItem();
scoreItem2.score = 5;
var scoreItem3 = new ScoreItem();
scoreItem3.score = 3;
list.push(scoreItem1);
list.push(scoreItem2);
list.push(scoreItem3);
var sumScore = 0;
for (var i=0;i<list.length;i++) {
    var scoreItem = list[i];
    sumScore = sumScore + scoreItem.score;
}
console.log((sumScore / list.length).toFixed(2))
