var dappAddress = "n1epszyjUwpap81wH35Cdk63zZ41yR8r4xW";
var serialNumber;
var NebPay;    //https://github.com/nebulasio/nebPay


var nebulas = require("nebulas"),
    Account = nebulas.Account,
    neb = new nebulas.Neb();
neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));

new Vue({
    el: '#app',
    data: function () {
        return {
            currentDeskBList: [],
            currentDeskFList: [],
            currentPlayFList: [],
            currentPlayBList: [],
            selectDesk: {},
            currentPage: 1,
            currentDate: new Date(),
            activeIndex: '1',
            activeIndex2: '1',
            deskLine1: true,
            deskLine2: true,
            deskLine3: false,
            deskLine4: false,
            pushStatus: false,
            createDialog: false,
            helpRuleDialog: false,
            ruleDialogVisible: false,
            joinDialog: false,
            currentNickName: "",
            joinButtonDesc: "",
            currentAccount: '',
            createDeskForm: {
                unitPrice: "0.001",
                playCount: 2,
            },
            joinDeskForm: {},
            totalCount: 0,
            pageSize: 10,
            showCurrentDeskButton: false,
            showHistoryDeskButton: true,
            downPageButton: false,
            upPageButton: false,
            listLoading: null,
            lianOpen: false,
            topDesc: "房号:1",
            deskDesc: "",
            historyIndex: -1
        };
    },
    methods: {
        toCurrentSpace() {
            this.deskLine3 = false;
            this.deskLine4 = false;
            this.deskLine1 = true;
            this.deskLine2 = true;
            this.showCurrentDeskButton = false;
            this.showHistoryDeskButton = true;
            this.currentPage = 1;
            this.getCurrentDeskList();
        },
        toHistorySpace() {
            this.deskLine3 = false;
            this.deskLine4 = false;
            this.deskLine1 = true;
            this.deskLine2 = true;
            this.showCurrentDeskButton = true;
            this.showHistoryDeskButton = false;
            this.currentPage = 1;
            this.getHistoryDeskList();
        },
        cancelClick() {
            this.deskLine3 = false;
            this.deskLine4 = false;
            this.deskLine1 = true;
            this.deskLine2 = true;
            if (this.showCurrentDeskButton) {
                this.getHistoryDeskList();
            } else {
                this.getCurrentDeskList();
            }

        },
        getCurrentDeskList() {
            this.listLoading = this.getLoading("当前区块牌局加载中..")
            var from = Account.NewAccount().getAddressString();
            var value = "0";
            var nonce = "0"
            var gas_price = "1000000"
            var gas_limit = "200000"
            var callFunction = "getCurrentDesk";
            var callArgs = [this.pageSize, ((this.currentPage - 1) * this.pageSize + 1)];
            var contract = {
                "function": callFunction,
                "args": JSON.stringify(callArgs)
            }
            var self = this;
            neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
                self.listProcess(resp.result);
            }).catch(function (err) {
                console.log("error:" + err.message)
                self.listLoading.close();
            })
        },
        getHistoryDeskList() {
            this.listLoading = this.getLoading("历史区块牌局加载中..")
            var from = Account.NewAccount().getAddressString();
            var value = "0";
            var nonce = "0"
            var gas_price = "1000000"
            var gas_limit = "200000"
            var callFunction = "getHistory";
            var callArgs = [this.pageSize, ((this.currentPage - 1) * this.pageSize + 1)];
            var contract = {
                "function": callFunction,
                "args": JSON.stringify(callArgs)
            }
            var self = this;
            neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
                self.listProcess(resp.result);
            }).catch(function (err) {
                console.log("error:" + err.message)
                self.listLoading.close();
            })
        },
        listProcess(resultStr) {
            let resultData = JSON.parse(resultStr);
            let result = resultData.data;
            var count = resultData.count ? resultData.count : 0;
            this.deskDesc = "当前牌局,共" + count + "桌";
            if (this.showCurrentDeskButton) {
                this.deskDesc = "历史牌局,共" + count + "桌";
            }
            if (result.length > 5) {
                this.currentDeskFList = result.slice(0, 5);
                this.currentDeskBList = result.slice(5, result.length);
            }
            else {
                this.currentDeskFList = result;
                this.currentDeskBList = [];
            }
            while (this.currentDeskBList.length < 5) {
                this.currentDeskBList.push({index: "-1"})
            }
            while (this.currentDeskFList.length < 5) {
                this.currentDeskFList.push({index: "-1"})
            }
            this.topDesc = "房号:" + this.currentPage;
            this.showUpPage();
            this.showDownPage(resultData.count);
            this.closeCreateFrom();
            this.createDeskForm.nickName = resultData.nickName;
            this.joinDeskForm.nickName = resultData.nickName;
            if (this.historyIndex > -1) {
                this.viewDesk(this.historyIndex);
            }
            this.listLoading.close();
        },
        showUpPage() {
            if (!this.deskLine1 || !this.deskLine2 || this.currentPage == 1) {
                this.upPageButton = false;
                return;
            }
            this.upPageButton = true;
        },
        showDownPage(count) {
            if (!this.deskLine1 || !this.deskLine2) {
                this.downPageButton = false;
                return;
            }
            if (this.pageSize * this.currentPage >= count) {
                this.downPageButton = false;
                return;
            }
            this.downPageButton = true;
        },
        createDesk() {
            var self = this;
            var desk = this.createDeskForm;
            NebPay = require("nebpay");     //https://github.com/nebulasio/nebPay
            nebPay = new NebPay();
            if (typeof(webExtensionWallet) === "undefined") {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '请先安装webExtensionWallet插件'
                });
                return;
            }
            if (!desk.nickName || desk.nickName.length < 2 || desk.nickName.length > 6) {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '昵称只能为2-6位字符'
                });
                return;
            }
            if (!desk.slogan || desk.slogan.length < 6 || desk.slogan.length > 20) {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '口号只能为6-20位字符'
                });
                return;
            }
            var args = [desk.unitPrice, desk.playCount, desk.slogan, desk.nickName, new Date().toLocaleString()];
            var to = dappAddress;
            var value = desk.unitPrice;
            var callFunction = "createDesk"
            var callArgs = JSON.stringify(args);
            serialNumber = nebPay.call(to, value, callFunction, callArgs, {    //使用nebpay的call接口去调用合约,
                listener: this.cbPush        //设置listener, 处理交易返回信息
            });
            self.listLoading = this.getLoading("请在星云钱包完成操作..")
        },
        joinDesk() {
            var self = this;
            NebPay = require("nebpay");     //https://github.com/nebulasio/nebPay
            nebPay = new NebPay();
            if (typeof(webExtensionWallet) === "undefined") {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '请先安装webExtensionWallet插件'
                });
                return;
            }
            if (!this.joinDeskForm.nickName || this.joinDeskForm.nickName.length < 2 || this.joinDeskForm.nickName.length > 6) {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '昵称只能为2-6位字符'
                });
                return;
            }
            if (this.selectDesk.nickName == this.joinDeskForm.nickName) {
                this.$message({
                    type: 'error',
                    showClose: true,
                    message: '昵称已经存在'
                });
                return;
            }
            var args = [this.selectDesk.index, this.joinDeskForm.nickName, new Date().toLocaleString()];
            var to = dappAddress;
            var value = this.selectDesk.deskUnits;
            var callFunction = "joinDesk"
            var callArgs = JSON.stringify(args);
            serialNumber = nebPay.call(to, value, callFunction, callArgs, {    //使用nebpay的call接口去调用合约,
                listener: this.cbPush        //设置listener, 处理交易返回信息
            });
            self.listLoading = this.getLoading("请在星云钱包完成操作..")
        },
        viewDesk(no) {
            let selectItem = {};
            for (let i = 0; i < this.currentDeskFList.length; i++) {
                if (no == this.currentDeskFList[i].index) {
                    selectItem = this.currentDeskFList[i];
                    break;
                }
            }
            for (let i = 0; i < this.currentDeskBList.length; i++) {
                if (no == this.currentDeskBList[i].index) {
                    selectItem = this.currentDeskBList[i];
                    break;
                }
            }
            this.deskProcess(selectItem);
        },
        deskProcess(selectItem) {
            this.selectDesk = selectItem;
            this.deskLine1 = false;
            this.deskLine2 = false;
            this.deskLine3 = true;
            this.deskLine4 = true;
            this.topDesc = "桌号:" + selectItem.index;
            if ((selectItem.playCount - selectItem.playList.length) == 1) {
                this.joinButtonDesc = "提交后立刻开牌赢nas,您需要支付 " + selectItem.deskUnits + "nas";
            } else {
                this.joinButtonDesc = "还差 " + (selectItem.playCount - selectItem.playList.length - 1) + " 人即开牌,您需要支付 " + selectItem.deskUnits + "nas";
            }
            let playList = Object.assign([], selectItem.playList);
            if (playList.length > 5) {
                this.currentPlayFList = playList.slice(0, 5);
                this.currentPlayBList = playList.slice(5, playList.length);
            }
            else {
                this.currentPlayFList = playList;
                this.currentPlayBList = [];
            }
            var winPlayer;
            for (let i = 0; i < this.currentPlayFList.length; i++) {
                let player = this.currentPlayFList[i];
                let pokerList = [];
                for (let j = 0; j < player.pokerList.length; j++) {
                    let pokerArray = player.pokerList[j];
                    pokerList.push("img/zjh/" + pokerArray[0] + "/" + pokerArray[1] + ".png");
                }
                player.pokerListShow = pokerList;
                if (player.winStatus == 1) {
                    winPlayer = player;
                }
            }
            for (let i = 0; i < this.currentPlayBList.length; i++) {
                let player = this.currentPlayBList[i];
                let pokerList = [];
                for (let j = 0; j < player.pokerList.length; j++) {
                    let pokerArray = player.pokerList[j];
                    pokerList.push("img/zjh/" + pokerArray[0] + "/" + pokerArray[1] + ".png");
                }
                player.pokerListShow = pokerList;
                if (player.winStatus == 1) {
                    winPlayer = player;
                }
            }
            while (this.currentPlayFList.length < 5) {
                this.currentPlayFList.push({winStatus: "-1"})
            }
            while (this.currentPlayBList.length < 5) {
                this.currentPlayBList.push({winStatus: "-1"})
            }
            if (this.showHistoryDeskButton || !winPlayer) {
                this.deskDesc = "本桌为 " + selectItem.playCount + " 人局,还差 " + (selectItem.playCount - selectItem.playList.length) + " 人开牌,底价 " + selectItem.deskUnits + "nas";
            }
            else {
                this.deskDesc = "恭喜 " + winPlayer.nickName + ",赢得 " + winPlayer.winFee + " nas"
            }
            this.historyIndex = -1;
        },
        funcIntervalQuery(txhash) {
            var self = this;
            self.listLoading.text = "交易确认中,请耐心等待.."
            this.receiptTransaction(txhash).then(function (resp) {
                var respObject = resp;
                console.log(JSON.stringify(resp));
                if (respObject.status == 1) {
                    clearInterval(self.intervalQuery);
                    self.$message({
                        type: 'success',
                        showClose: true,
                        message: '交易确认成功'
                    });
                    self.listLoading.close();
                    var resultObj = JSON.parse(respObject.execute_result);
                    self.joinDialog = false;
                    if (resultObj && resultObj > -1) {
                        self.toHistorySpace();
                        self.historyIndex = resultObj;
                    }
                    else {
                        self.toCurrentSpace();
                    }
                } else if (respObject.status == 0) {
                    clearInterval(self.intervalQuery);
                    self.$message({
                        type: 'error',
                        showClose: true,
                        message: '确认失败,原因' + respObject.execute_result
                    });
                    self.listLoading.close();
                }
            }).catch(function (err) {
                clearInterval(self.intervalQuery);
                self.listLoading.close();
                self.$message({
                    type: 'error',
                    showClose: true,
                    message: '提交失败,请重试' + err + ' ;hash=' + txhash
                });
            })
        },
        // 查询交易结果
        receiptTransaction(txhash) {
            var promise = new Promise(function (resolve, reject) {
                neb.api.getTransactionReceipt(txhash).then(function (resp) {
                    resolve(resp);
                }).catch(function (err) {
                    console.log(err);
                });
            });
            return promise
        },
        handleNextChange() {
            this.currentPage = this.currentPage + 1;
            if (!this.showCurrentDeskButton) {
                this.getCurrentDeskList();
            } else {
                this.getHistoryDeskList();
            }
        },
        handleUpChange() {
            this.currentPage = this.currentPage - 1;
            if (!this.showCurrentDeskButton) {
                this.getCurrentDeskList();
            } else {
                this.getHistoryDeskList();
            }
        },
        cbPush(resp) {
            var self = this;
            if (!resp.txhash) {
                self.listLoading.close();
                self.$message({
                    type: 'error',
                    showClose: true,
                    message: '提交失败,原因' + resp.execute_result
                });
                return;
            }
            self.intervalQuery = setInterval(function () {
                self.funcIntervalQuery(resp.txhash);
            }, 3000);
            console.log("response of push: " + JSON.stringify(resp))
        },
        getLoading(text) {
            return this.$loading({
                lock: true,
                text: text,
                spinner: 'el-icon-loading',
                customClass: 'loading-bg',
            });
        },
        closeCreateFrom() {
            this.createDialog = false;
            this.createDeskForm = {
                unitPrice: '0.00001',
                playCount: 2,
            }
        },
        initAccount() {
            window.postMessage({
                "target": "contentscript",
                "data": {},
                "method": "getAccount",
            }, "*");
            var self = this;
            window.addEventListener('message', function (e) {
                if (e.data.data && !!e.data.data.account) {
                    self.currentAccount = e.data.data.account;
                }
            });
        },

    },
    mounted: function () {
        this.getCurrentDeskList();
        this.initAccount();
    }
})

