var dappAddress = "n1x2NjVAwQMUSLxqJz9Xb13HRten2bA74Ln";
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
            selectDesk:{},
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
            joinButtonDesc: "",
            currentAccount: '',
            createDeskForm: {
                unitPrice: '0.001',
                playCount: 2,
            },
            joinDeskForm: {},
            totalCount: 0,
            pageSize: 10,
            listLoading: null,
            topDesc: "房号:1",
            deskDesc: ""
        };
    },
    methods: {
        toCurrentSpace() {
            this.deskLine3 = false;
            this.deskLine4 = false;
            this.deskLine1 = true;
            this.deskLine2 = true;

        },
        toHistorySpace() {
            this.deskLine1 = false;
            this.deskLine2 = false;
            this.deskLine3 = true;
            this.deskLine4 = true;
        },
        getCurrentDeskList() {
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
                let result = JSON.parse(resp.result);
                if (result.length > 5) {
                    self.currentDeskFList = result.slice(0, 5);
                    self.currentDeskBList = result.slice(5, result.length);
                }
                else {
                    self.currentDeskFList = result;
                    self.currentDeskBList = [];
                }
                while (self.currentDeskBList.length < 5) {
                    self.currentDeskBList.push({index: "-1"})
                }
                while (self.currentDeskFList.length < 5) {
                    self.currentDeskFList.push({index: "-1"})
                }
                self.totalCount = result.totalCount;
            }).catch(function (err) {
                console.log("error:" + err.message)
            })
        },
        getHistoryDeskList() {
            var from = Account.NewAccount().getAddressString();
            var value = "0";
            var nonce = "0"
            var gas_price = "1000000"
            var gas_limit = "200000"
            var callFunction = "getHistory";
            var callArgs = [this.pageSize];
            var contract = {
                "function": callFunction,
                "args": JSON.stringify(callArgs)
            }
            var self = this;
            neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
                let result = JSON.parse(resp.result);
                if (result.length > 5) {
                    self.currentDeskFList = result.slice(0, 5);
                    self.currentDeskBList = result.slice(5, result.length);
                }
                else {
                    self.currentDeskFList = result;
                    self.currentDeskBList = [];
                }
                while (self.currentDeskBList.length < 5) {
                    self.currentDeskBList.push({index: "-1"})
                }
                while (self.currentDeskFList.length < 5) {
                    self.currentDeskFList.push({index: "-1"})
                }
                self.totalCount = result.totalCount;
            }).catch(function (err) {
                console.log("error:" + err.message)
            })
        },
        createDesk() {
            var self = this;
            var desk = {
                unitPrice:0.001,
                playCount:2,
                slogan:'ddd',
                nickName:'ss',

            }
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
            var args = [desk.unitPrice, desk.playCount, desk.slogan, desk.nickName, new Date().toLocaleString()];
            var to = dappAddress;
            var value = desk.unitPrice;
            var callFunction = "createDesk"
            var callArgs = JSON.stringify(args);
            serialNumber = nebPay.call(to, value, callFunction, callArgs, {    //使用nebpay的call接口去调用合约,
                listener: this.cbPush        //设置listener, 处理交易返回信息
            });
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
            var args = ['0', '11112'];
            var to = dappAddress;
            var value = 0.00002;
            var callFunction = "joinDesk"
            var callArgs = JSON.stringify(args);
            serialNumber = nebPay.call(to, value, callFunction, callArgs, {    //使用nebpay的call接口去调用合约,
                listener: this.cbPush        //设置listener, 处理交易返回信息
            });
        },
        viewDesk(no) {
            let selectItem = {};
            for (let i = 0; i < this.currentDeskFList.length; i++) {
                if (no == this.currentDeskFList[i].index) {
                    selectItem = this.currentDeskFList[i];
                    break;
                }
            }
            this.selectDesk = selectItem;
            this.deskLine1 = false;
            this.deskLine2 = false;
            this.deskLine3 = true;
            this.deskLine4 = true;
            this.topDesc = "桌号:" + no;
            this.deskDesc = "本桌为 " + selectItem.playCount + " 人局,还差 " + (selectItem.playCount - selectItem.playList.length) + " 人开牌,底价 " + selectItem.deskUnits + "nas";
            if ((selectItem.playCount - selectItem.playList.length) == 1) {
                this.joinButtonDesc = "提交后立刻开牌赢nas,您需要支付 " + selectItem.deskUnits + "nas";
            } else {
                this.joinButtonDesc = "还 " + (selectItem.playCount - selectItem.playList.length - 1) + " 人即开牌,您需要支付 " + selectItem.deskUnits + "nas";
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
            for (let i = 0; i < this.currentPlayFList.length; i++) {
                let player = this.currentPlayFList[i];
                let pokerList = [];
                for (let j = 0; j < player.pokerList.length; j++) {
                    let pokerArray = player.pokerList[j];
                    pokerList.push("img/zjh/" + pokerArray[0] + "/" + pokerArray[1] + ".png");
                }
                player.pokerList = pokerList;
            }
            for (let i = 0; i < this.currentPlayBList.length; i++) {
                let player = this.currentPlayBList[i];
                let pokerList = [];
                for (let j = 0; j < player.pokerList.length; j++) {
                    let pokerArray = player.pokerList[j];
                    pokerList.push("img/zjh/" + pokerArray[0] + "/" + pokerArray[1] + ".png");
                }
                player.pokerList = pokerList;
            }
            while (this.currentPlayFList.length < 5) {
                this.currentPlayFList.push({winStatus: "-1"})
            }
            while (this.currentPlayBList.length < 5) {
                this.currentPlayBList.push({winStatus: "-1"})
            }
        },
        pushCoach() {
            this.activeName = 'second';
        },
        cancelPush() {
            this.activeName = 'first';
        },
        funcIntervalQuery(txhash) {
            var self = this;
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
                    self.getCurrentDeskList();
                } else if (respObject.status == 0) {
                    clearInterval(self.intervalQuery);
                    self.$message({
                        type: 'error',
                        showClose: true,
                        message: '确认失败,原因' + respObject.execute_result
                    });
                }
            }).catch(function (err) {
                clearInterval(self.intervalQuery);
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
        handleClick(tab, event) {
            console.log(tab, event);
        },
        handleSizeChange(val) {
            this.pageSize = val;
            this.getCurrentDeskList();
        },
        handleCurrentChange(val) {
            this.currentPage = val;
            this.getCurrentDeskList();
        },
        cbPush(resp) {
            var self = this;
            if (!resp.txhash) {
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

