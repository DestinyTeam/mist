/**
@module ethereumNodes
*/

const _ = require('underscore');
const fs = require('fs');
const app = require('app');
const spawn = require('child_process').spawn;
const ipc = require('electron').ipcMain;
const getNodePath = require('./getNodePath.js');
const popupWindow = require('./popupWindow.js');
const logRotate = require('log-rotate');


nd = ["enode://f944c6702a78a0cbcd6505b76daff069dad2e45ff88896c475da2bef47091c88e5b4042211233e397ad958be998003a2674151e60719c5fdeeff5f8cc2c231a1@74.196.59.103:42786","enode://aa88a4ab996b1f9f1725f4e2fc13872505b4256133c08c9ce538587bb3f297c0cabe7489567d52c3ea5d293bfcb9aab8de8d6010fdfe55a87bb530feb6dc4095@198.199.101.138:42786","enode://aea9674bebbf9f7c75587857444602f746390414edbb51f3bb6c47d9d46eea4299ce7e7fee114ff5a808ab616885071d48ac0f7bfc5bc79ee9a25b51783c8a3e@90.161.84.133:55296","enode://c18847e77fc5be742b313c27d803ad0d44b895cceaa9279ec451373428052df26021370d9595c7a9c7c2eba37318e28012ee3d892cd9c83b4d3d7d89fa28a46b@38.129.217.241:50253","enode://c622bee5a3cf6c03e5d44b4ff985b80a151ecff136dbd5770aa2998320fb10d5ab1526549fa334dd4701a42f2911b0384149ca034c23238e0aa395f47e944c9a@186.89.224.46:42786","enode://cec827dcbfcc53f94166f3e354e7989a8425e148d25f14fc7c7b6ab2a3b0c4efb4937b5736ced049f1c5e53532c5bdb0a7156c7c6bda9abc7adf84940522ff25@37.187.156.231:38100","enode://d33a8d4c2c38a08971ed975b750f21d54c927c0bf7415931e214465a8d01651ecffe4401e1db913f398383381413c78105656d665d83f385244ab302d6138414@128.199.183.48:56770","enode://d67914b9d93e1733dfb4e742a3eca8f65bc6a5ed69f3aa6bf2451033f8bd033be1fe97016f56b738e58e84d715b3315e697c792a0160804e25b9b849b6b8a69f@142.4.214.65:36768","enode://df872f81e25f72356152b44cab662caf1f2e57c3a156ecd20e9ac9246272af68a2031b4239a0bc831f2c6ab34733a041464d46b3ea36dce88d6c11714446e06b@78.62.208.109:39439","enode://ee55b4957cf3a4e4a45bc9db1f9979a536f6468e035f6fe8949f444c5bf345ff3b76fe3b995c66a7f49784b975f13f84b522818dc612c74f3c452206fd1311b4@78.94.32.196:44283","enode://f0d4f3d2d4de3a36e4c616223eee55c8760ce429519d3b2a36047e121344d168a98436fc554ab02f19a1327b91e53f280a5b9fa64f5048f9d94881eaf467d15d@137.117.164.66:1024","enode://f685aeec6b1fef4595e76cd7e575e7135dda16188f59ab359a587aeab44318d99df728d4c1c3caf94c4ce72f45716afbae203c4961801991bd5076a01f85db44@95.32.211.186:6068","enode://fb811999ac503f5aee8009bd408342f5cd447d29830d918bbffd181530766741dc75736a37c537b5380c89f43b06519c85efca1ac2428662232ebf6a97d40889@23.240.212.84:16853","enode://5f6c625bf287e3c08aad568de42d868781e961cbda805c8397cfb7be97e229419bef9a5a25a75f97632787106bba8a7caf9060fab3887ad2cfbeb182ab0f433f@46.101.182.53:42786", "enode://df872f81e25f72356152b44cab662caf1f2e57c3a156ecd20e9ac9246272af68a2031b4239a0bc831f2c6ab34733a041464d46b3ea36dce88d6c11714446e06b@178.62.208.109:42786",
"enode://f6f0d6b9b7d02ec9e8e4a16e38675f3621ea5e69860c739a65c1597ca28aefb3cec7a6d84e471ac927d42a1b64c1cbdefad75e7ce8872d57548ddcece20afdd1@159.203.64.95:42786","enode://4055ec69e53df4bfecb95e3b65c28e4f2a1145a3bdc4d85d077b552248cf159951afd649f044783bebf48b902fbc0e96978c76236fd4ab3d5ef7d95d72b84ee5@[::]:42786"];
bootstrapNodes=""
for(c=0; c<nd.length; c++)
  bootstrapNodes+=nd[c]+" "



module.exports = {
    /**
    Stop all running nodes.

    @method stopNodes
    */
    stopNodes: function(callback) {
        console.log('Stopping nodes...');

        var node = global.nodes.geth || global.nodes.eth;

        // kill running geth
        if(node) {
            node.stderr.removeAllListeners('data');
            node.stdout.removeAllListeners('data');
            node.stdin.removeAllListeners('error');
            node.removeAllListeners('error');
            node.removeAllListeners('exit');
            node.kill('SIGINT');

            // kill if not closed already
            var timeoutId = setTimeout(function(){
                node.kill('SIGKILL');
                if(_.isFunction(callback))
                    callback();

                node = null;
            }, 8000);

            node.once('close', function(){
                clearTimeout(timeoutId);
                if(_.isFunction(callback))
                    callback();

                node = null;
            });

        } else {
            if(_.isFunction(callback))
                callback();
        }
    },
    /**
    Starts a node of type

    @method startNode
    @param {String} type the node e.g. "geth" or "eth"
    @param {Boolean} testnet
    @param {Function} callback will be called after successfull start
    */
    startNode: function(type, testnet, callback){
        var _this = this,
            called = false;

        var binPath = getNodePath(type);

        console.log('Start node from '+ binPath);

        if(type === 'eth') {

            var modalWindow = popupWindow.show('unlockMasterPassword', {width: 400, height: 220, alwaysOnTop: true}, null, null, true);
            modalWindow.on('closed', function() {
                if(!called)
                    app.quit();
            });

            var popupCallback = function(e){
                if(!e) {
                    called = true;
                    modalWindow.close();
                    modalWindow = null;
                    ipc.removeAllListeners('backendAction_unlockedMasterPassword');

                } else if(modalWindow) {
                    modalWindow.webContents.send('data', {masterPasswordWrong: true});
                }
            };

            ipc.on('backendAction_unlockedMasterPassword', function(ev, err, result){
                if(modalWindow.webContents && ev.sender.getId() === modalWindow.webContents.getId()) {

                    if(!err) {
                        _this._startProcess(type, testnet, binPath, result, callback, popupCallback);

                    } else {
                        app.quit();
                    }

                    result = null;
                }
            });
        } else {
            _this._startProcess(type, testnet, binPath, null, callback);
        }

        return global.nodes[type];
    },
    /**
    Writes the node type, which will be started on next start to a file.

    @method _writeNodeToFile
    */
    _writeNodeToFile: function(writeType, testnet){
        // set standard node
        fs.writeFile(global.path.USERDATA + '/node', writeType, function(err) {
            if(!err) {
                console.log('Saved standard node "'+ writeType +'" to file: '+ global.path.USERDATA + '/node');
            } else {
                console.log(err);
            }
        });

        // set the global varibale to testnet
        global.network = testnet ? 'test' : 'main';

        // write network type
        fs.writeFile(global.path.USERDATA + '/network', global.network , function(err) {
            if(!err) {
                console.log('Saved network type "'+ global.network +'" to file: '+ global.path.USERDATA + '/network');
            } else {
                console.log(err);
            }
        });
    },
    /**

    @method _startProcess
    */
    _startProcess: function(type, testnet, binPath, pw, callback, popupCallback){
        var _this = this,
            cbCalled = false,
            error = false,
            logfilePath = global.path.USERDATA + '/node.log';


        // rename the old log file
        logRotate(logfilePath, {count: 5}, function(err) {

            var logFile = fs.createWriteStream(logfilePath, {flags: 'a'});

            _this.stopNodes();

            console.log('Starting '+ type +' node...');

            // wrap the starting callback
            var callCb = function(err, res){

                _this._writeNodeToFile(type, testnet);
                
                cbCalled = true;
                if(err)
                    error = true;
                callback(err, res);
            };



            // START TESTNET
            if(testnet) {
                args = (type === 'geth') ? ['--testnet', '--fast'] : ['--morden', '--unsafe-transactions'];

            // START MAINNET
            } else {
                args = (type === 'geth') ? ['--fast', '--bootnodes="'+bootstrapNodes+'"'] : ['--unsafe-transactions', '--master', pw];
                pw = null;
            }

            global.nodes[type] = spawn(binPath, args);


            // node has a problem starting
            global.nodes[type].once('error',function(e){
                error = true;

                if(!cbCalled && _.isFunction(callback)){
                    callCb('Couldn\'t start '+ type +' node!');
                }
            });

            // node quit, e.g. master pw wrong
            global.nodes[type].once('exit',function(){

                // If is eth then the password was typed wrong
                if(!cbCalled && type === 'eth') {
                    _this.stopNodes();

                    if(popupCallback)
                        popupCallback('Masterpassword wrong');

                    // set default to geth, to prevent beeing unable to start the wallet
                    _this._writeNodeToFile('geth', testnet);

                    console.log('Password wrong '+ type +' node!');
                }
            });

            // we need to read the buff to prevent geth/eth from stop working
            global.nodes[type].stdout.on('data', function(data) {

                // console.log('stdout ', data.toString());
                if(!cbCalled && _.isFunction(callback)){

                    // (eth) prevent starting, when "Ethereum (++)" didn't appear yet (necessary for the master pw unlock)
                    if(type === 'eth' && data.toString().indexOf('Ethereum (++)') === -1)
                        return;
                    else if(popupCallback)
                        popupCallback(null);

                    callCb(null);
                }
            });
            // stream log output
            global.nodes[type].stderr.pipe(logFile);
            global.nodes[type].stderr.on('data', function(data) {

                // dont react on stderr when eth++
                if(type === 'eth')
                    return;

                // console.log('stderr ', data.toString());
                if(!cbCalled && _.isFunction(callback)) {

                    // (geth) prevent starying until IPC service is started
                    if(type === 'geth' && data.toString().indexOf('IPC service started') === -1)
                        return;

                    callCb(null);
                }
            });

            
        });
    }
};
