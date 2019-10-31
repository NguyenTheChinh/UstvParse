let originalRules = require('./rules.json');
let requestPromise = require('request-promise').defaults({jar: true});
let bodyParser = require('body-parser');
let tough = require('tough-cookie');

const express = require('express');
const app = express();
const port = 3000;
app.use(bodyParser.urlencoded());

app.use(bodyParser.json());

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`server is listening on ${port}`);
});

app.get('/debug', function () {
    console.log(Res);
    debugger;
});

app.get('/', async (req, res) => {
    if (req.query.url) {
        let link = await getLink(req.query.url).catch(ref => {

        });
        if (link) {
            res.json({
                Result: 1,
                Url: link
            });
        } else {
            res.json({
                Result: 0,
                Reason: "",
            })
        }
    } else {
        res.json({
            Result: 0,
            Reason: "Thiếu đường dẫn"
        });
    }
});

let debugIds = [8];
// let debugIds = [];

function getLink(link) {
    return new Promise(async resolve => {
        try {
            let goto;
            let Link = link;
            let tempResult;
            let rules = JSON.parse(JSON.stringify(originalRules));
            for (let ite = 0; ite < rules.Rules.length; ite++) {
                let rule = rules.Rules[ite];
                if (Link.indexOf(rule.Match) !== -1) {
                    console.log(rule.Name);
                    for (let j = 0; j < rule.Stages.length; j++) {
                        let stage = rule.Stages[j];
                        if (debugIds.indexOf(stage.Id) !== -1) debugger;
                        if (goto && stage.Id != goto) continue;
                        goto = undefined;
                        console.log(stage.Id, stage.Action);
                        switch (stage.Action) {
                            case "GOTO":
                                if (stage.Stage.match(/^\$\w+$/)) {
                                    stage.Stage = eval(stage.Stage.match(/\w+/)[0]);
                                }
                                goto = stage.Stage;
                                break;

                            case "CONCAT":
                                // duyệt mảng thay các chuỗi bắt đầu bằng giá trị biến
                                stage.Targets.forEach((target, index) => {
                                    if (target.match(/^\$\w+$/)) {
                                        stage.Targets[index] = eval(target.match(/\w+/)[0]);
                                    }
                                });

                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(stage.Targets.join(""))}`);
                                break;

                            case "EVAL":
                                if (stage.String.match(/^\$\w+$/)) {
                                    stage.String = eval(stage.String.match(/\w+/)[0]);
                                } else stage.String = eval(stage.String);
                                tempResult = eval(stage.String);
                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(tempResult)}`);
                                break;

                            case "REPLACE":
                                if (stage.In.match(/^\$\w+$/)) {
                                    stage.In = eval(stage.In.match(/\w+/)[0]);
                                }
                                if (stage.From.match(/^\$\w+$/)) {
                                    stage.From = eval(stage.From.match(/\w+/)[0]);
                                }
                                if (stage.To.match(/^\$\w+$/)) {
                                    stage.To = eval(stage.To.match(/\w+/)[0]);
                                }

                                let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "gm");
                                // let replaceRegex = new RegExp(`${((stage.From))}`, "gm");
                                tempResult = stage.In.replace(replaceRegex, stage.To);
                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(tempResult)}`);
                                break;

                            case "GET":
                                if (stage.Link.match(/^\$\w+$/)) {
                                    stage.Link = eval(stage.Link.match(/\w+/)[0]);
                                }

                                if (stage.Headers && stage.Headers.match(/^\$\w+$/)) {
                                    stage.Headers = eval(stage.Headers.match(/\w+/)[0]);
                                }

                                let options = {
                                    uri: stage.Link,
                                    headers: {},
                                    resolveWithFullResponse: true
                                };
                                let headers = stage.Headers;
                                if (headers) {
                                    headers = headers.split("::");
                                    headers.forEach((headerValue, index) => {
                                        if (index % 2 === 0) options.headers[headerValue] = "";
                                        else options.headers[headers[index - 1]] = headerValue;
                                    });
                                }

                                let requestSucess = false;
                                await requestPromise(options).then(function (htmlString) {
                                    console.log(htmlString.body);
                                    eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(htmlString.body)}`);
                                    requestSucess = true;
                                })
                                    .catch(function (err) {
                                        if (err.statusCode === 503 || err.statusCode === 302) {
                                            eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(err.error)}`);
                                            requestSucess = true;
                                        } else {
                                            requestSucess = false;
                                            console.error(err)
                                        }
                                    });
                                if (!requestSucess) return resolve(false);
                                break;

                            case "POST":
                                if (stage.Link.match(/^\$\w+$/)) {
                                    stage.Link = eval(stage.Link.match(/\w+/)[0]);
                                }

                                if (stage.Headers && stage.Headers.match(/^\$\w+$/)) {
                                    stage.Headers = eval(stage.Headers.match(/\w+/)[0]);
                                }

                                if (stage.Params.match(/^\$\w+$/)) {
                                    stage.Params = eval(stage.Params.match(/\w+/)[0]);
                                }

                                let postOptions = {
                                    method: 'POST',
                                    uri: stage.Link,
                                    headers: {},
                                };

                                let postHeaders = stage.Headers;
                                if (postHeaders) {
                                    postHeaders = postHeaders.split("::");
                                    postHeaders.forEach((headerValue, index) => {
                                        if (index % 2 === 0) postOptions.headers[headerValue] = "";
                                        else postOptions.headers[postHeaders[index - 1]] = headerValue;
                                    });
                                }

                                let postRequestSucess = false;
                                await requestPromise(postOptions).then(function (htmlString) {
                                    console.log(htmlString);
                                    eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
                                    postRequestSucess = true;
                                })
                                    .catch(function (err) {
                                        postRequestSucess = false;
                                        console.error(err)
                                    });
                                if (!postRequestSucess) return resolve(false);

                                break;

                            case "MATCH":
                                let matchString = stage.Target;
                                if (stage.Target.match(/^\$\w+$/)) {
                                    matchString = eval(stage.Target.match(/\w+/)[0]);
                                }

                                if (stage.String.match(/^\$\w+$/)) {
                                    stage.String = eval(stage.String.match(/\w+/g)[0]);
                                }

                                if (stage.Default && stage.Default.match(/^\$\w+$/)) {
                                    stage.Default = eval(stage.Default.match(/\w+/g)[0]);
                                }

                                if (stage.MatchId.match(/^\$\w+$/)) {
                                    stage.MatchId = eval(stage.MatchId.match(/\w+/g)[0]);
                                }

                                if (stage.GroupId.match(/^\$\w+$/)) {
                                    stage.GroupId = eval(stage.GroupId.match(/\w+/g)[0]);
                                }

                                const matchRegex = new RegExp(`${stage.String}`, "g");
                                if (matchString.match(matchRegex)) tempResult = matchString.match(matchRegex)[stage.MatchId];
                                else {
                                    tempResult = stage.Default || "";
                                }

                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(tempResult)}`);
                                break;
                            case "FINAL":
                                return resolve(eval(stage.Result.match(/\w+/)[0]));
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    })
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// var s = {},
//     u, c, U, r, i, l = 0,
//     a, e = eval,
//     w = String.fromCharCode,
//     sucuri_cloudproxy_js = '',
//     S = 'Yz0iZiIgKyAiNnN1Y3VyIi5jaGFyQXQoMCkrImRzdWN1ciIuY2hhckF0KDApKyc8OCcuc2xpY2UoMSwyKSsnNCcgKyAgIiIgKyJmIi5zbGljZSgwLDEpICsgU3RyaW5nLmZyb21DaGFyQ29kZSgweDYyKSArICI2Ii5zbGljZSgwLDEpICsgU3RyaW5nLmZyb21DaGFyQ29kZSgweDMzKSArICJic3VjdXIiLmNoYXJBdCgwKSsiIiArImMiLnNsaWNlKDAsMSkgKyAiOHN1Ii5zbGljZSgwLDEpICsgICcnICsnJysnOCcgKyAgIjgiICsgIiIgKyJmIiArICI5c3UiLnNsaWNlKDAsMSkgKyAiNiIgKyAiMCIuc2xpY2UoMCwxKSArICdkJyArICAgJycgKydSMycuc2xpY2UoMSwyKSsnNCcgKyAgICcnICsgCiJmc3VjdXIiLmNoYXJBdCgwKSsgJycgKycnKyI2c2VjIi5zdWJzdHIoMCwxKSArICdmJyArICAnbklkJy5jaGFyQXQoMikrICcnICsnJysiMHNlYyIuc3Vic3RyKDAsMSkgKyAiOHN1Ii5zbGljZSgwLDEpICsgICcnICsgCic1Yicuc2xpY2UoMSwyKSsnMicgKyAgICcnICsgCic2JyArICAnYScgKyAgICcnICsnVDEnLnNsaWNlKDEsMikrJyc7ZG9jdW1lbnQuY29va2llPSdzJysndScrJ2NzJy5jaGFyQXQoMCkrJ3N1Y3V1Jy5jaGFyQXQoNCkrICdyJysnJysnaScrJ18nLmNoYXJBdCgwKSsnYycrJ2wnKycnKydvc3VjJy5jaGFyQXQoMCkrICdzdWN1cml1Jy5jaGFyQXQoNikrJ2RzJy5jaGFyQXQoMCkrJ3BzdScuY2hhckF0KDApICsnc3VjdXJyJy5jaGFyQXQoNSkgKyAnbycuY2hhckF0KDApKyd4JysnJysneScrJ3N1Y3VfJy5jaGFyQXQoNCkrICdzdWN1cnUnLmNoYXJBdCg1KSArICd1Jy5jaGFyQXQoMCkrJ2lzdWN1cicuY2hhckF0KDApKyAnZCcuY2hhckF0KDApKydzdWN1cmlfJy5jaGFyQXQoNikrJ2YnKydzdWN1cmlkJy5jaGFyQXQoNikrJzMnKycyc3VjdXInLmNoYXJBdCgwKSsgJzlzdWMnLmNoYXJBdCgwKSsgJ2NzdScuY2hhckF0KDApICsnOCcrJzBzdWMnLmNoYXJBdCgwKSsgJ2MnKycnKyI9IiArIGMgKyAnO3BhdGg9LzttYXgtYWdlPTg2NDAwJzsgbG9jYXRpb24ucmVsb2FkKCk7';
// L = S.length;
// U = 0;
// r = '';
// var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// for (u = 0; u < 64; u++) {
//     s[A.charAt(u)] = u;
// }
// for (i = 0; i < L; i++) {
//     c = s[S.charAt(i)];
//     U = (U << 6) + c;
//     l += 6;
//     while (l >= 8) {
//         ((a = (U >>> (l -= 8)) & 0xff) || (i < (L - 2))) && (r += w(a));
//     }
// }
// debugger;
// e(r);
//
// c = "f" + "6sucur".charAt(0) + "dsucur".charAt(0) + '<8'.slice(1, 2) + '4' + "" + "f".slice(0, 1) + String.fromCharCode(0x62) + "6".slice(0, 1) + String.fromCharCode(0x33) + "bsucur".charAt(0) + "" + "c".slice(0, 1) + "8su".slice(0, 1) + '' + '' + '8' + "8" + "" + "f" + "9su".slice(0, 1) + "6" + "0".slice(0, 1) + 'd' + '' + 'R3'.slice(1, 2) + '4' + '' +
//     "fsucur".charAt(0) + '' + '' + "6sec".substr(0, 1) + 'f' + 'nId'.charAt(2) + '' + '' + "0sec".substr(0, 1) + "8su".slice(0, 1) + '' +
//     '5b'.slice(1, 2) + '2' + '' +
//     '6' + 'a' + '' + 'T1'.slice(1, 2) + '';
// document.cookie = 's' + 'u' + 'cs'.charAt(0) + 'sucuu'.charAt(4) + 'r' + '' + 'i' + '_'.charAt(0) + 'c' + 'l' + '' + 'osuc'.charAt(0) + 'sucuriu'.charAt(6) + 'ds'.charAt(0) + 'psu'.charAt(0) + 'sucurr'.charAt(5) + 'o'.charAt(0) + 'x' + '' + 'y' + 'sucu_'.charAt(4) + 'sucuru'.charAt(5) + 'u'.charAt(0) + 'isucur'.charAt(0) + 'd'.charAt(0) + 'sucuri_'.charAt(6) + 'f' + 'sucurid'.charAt(6) + '3' + '2sucur'.charAt(0) + '9suc'.charAt(0) + 'csu'.charAt(0) + '8' + '0suc'.charAt(0) + 'c' + '' + "=" + c + ';path=/;max-age=86400';
// location.reload();
//
//
// s = {}, u, c, U, r, i, l = 0, a, e = eval, w = String.fromCharCode, sucuri_cloudproxy_js = '', S = 'Yz0iZiIgKyAiNnN1Y3VyIi5jaGFyQXQoMCkrImRzdWN1ciIuY2hhckF0KDApKyc8OCcuc2xpY2UoMSwyKSsnNCcgKyAgIiIgKyJmIi5zbGljZSgwLDEpICsgU3RyaW5nLmZyb21DaGFyQ29kZSgweDYyKSArICI2Ii5zbGljZSgwLDEpICsgU3RyaW5nLmZyb21DaGFyQ29kZSgweDMzKSArICJic3VjdXIiLmNoYXJBdCgwKSsiIiArImMiLnNsaWNlKDAsMSkgKyAiOHN1Ii5zbGljZSgwLDEpICsgICcnICsnJysnOCcgKyAgIjgiICsgIiIgKyJmIiArICI5c3UiLnNsaWNlKDAsMSkgKyAiNiIgKyAiMCIuc2xpY2UoMCwxKSArICdkJyArICAgJycgKydSMycuc2xpY2UoMSwyKSsnNCcgKyAgICcnICsgCiJmc3VjdXIiLmNoYXJBdCgwKSsgJycgKycnKyI2c2VjIi5zdWJzdHIoMCwxKSArICdmJyArICAnbklkJy5jaGFyQXQoMikrICcnICsnJysiMHNlYyIuc3Vic3RyKDAsMSkgKyAiOHN1Ii5zbGljZSgwLDEpICsgICcnICsgCic1Yicuc2xpY2UoMSwyKSsnMicgKyAgICcnICsgCic2JyArICAnYScgKyAgICcnICsnVDEnLnNsaWNlKDEsMikrJyc7ZG9jdW1lbnQuY29va2llPSdzJysndScrJ2NzJy5jaGFyQXQoMCkrJ3N1Y3V1Jy5jaGFyQXQoNCkrICdyJysnJysnaScrJ18nLmNoYXJBdCgwKSsnYycrJ2wnKycnKydvc3VjJy5jaGFyQXQoMCkrICdzdWN1cml1Jy5jaGFyQXQoNikrJ2RzJy5jaGFyQXQoMCkrJ3BzdScuY2hhckF0KDApICsnc3VjdXJyJy5jaGFyQXQoNSkgKyAnbycuY2hhckF0KDApKyd4JysnJysneScrJ3N1Y3VfJy5jaGFyQXQoNCkrICdzdWN1cnUnLmNoYXJBdCg1KSArICd1Jy5jaGFyQXQoMCkrJ2lzdWN1cicuY2hhckF0KDApKyAnZCcuY2hhckF0KDApKydzdWN1cmlfJy5jaGFyQXQoNikrJ2YnKydzdWN1cmlkJy5jaGFyQXQoNikrJzMnKycyc3VjdXInLmNoYXJBdCgwKSsgJzlzdWMnLmNoYXJBdCgwKSsgJ2NzdScuY2hhckF0KDApICsnOCcrJzBzdWMnLmNoYXJBdCgwKSsgJ2MnKycnKyI9IiArIGMgKyAnO3BhdGg9LzttYXgtYWdlPTg2NDAwJzsgbG9jYXRpb24ucmVsb2FkKCk7';
// L = S.length;
// U = 0;
// r = '';
// A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// for (u = 0; u < 64; u++) {
//     s[A.charAt(u)] = u;
// }
// for (i = 0; i < L; i++) {
//     c = s[S.charAt(i)];
//     U = (U << 6) + c;
//     l += 6;
//     while (l >= 8) {
//         ((a = (U >>> (l -= 8)) & 0xff) || (i < (L - 2))) && (r += w(a));
//     }
// }
// ;

// eval("z='lY2'.charAt(2)+'a' +   '' +''+"9c".charAt(0) +  '' +''+"c" +  '' +
// 'K5'.slice(1,2)+'e' +  "9sec".substr(0,1) + '08'.slice(1,2)+"3sec".substr(0,1) + "asu".slice(0,1) +  '' +
// "8s".charAt(0) + '7' +  "0".slice(0,1) + "" +'9' +  String.fromCharCode(0x62) + '4yH9'.substr(3, 1) +"" +'Ts94'.substr(3, 1) + '' +
// "fsu".slice(0,1) + "d".slice(0,1) + '<8'.slice(1,2)+ '' +"f".slice(0,1) +  '' +'a' +   '' +''+"8n".charAt(0) + "1" + "5sucur".charAt(0)+ '' +
// 'Fe'.slice(1,2)+"5".slice(0,1) +  '' +
// String.fromCharCode(0x35) + "8" + "6sec".substr(0,1) + "" +"1sucur".charAt(0)+ '' +
// '5' +  "" +'';;Res4='s'+'sucuru'.charAt(5) + 'csucur'.charAt(0)+ 'sucuru'.charAt(5) + 'sucur'.charAt(4)+ 'si'.charAt(1)+'_suc'.charAt(0)+ 'c'+''+'l'+'sucuro'.charAt(5) + 'u'.charAt(0)+'sd'.charAt(1)+'psucu'.charAt(0)  +'rsuc'.charAt(0)+ 'osucuri'.charAt(0) + 'xsucu'.charAt(0)  +'suy'.charAt(2)+'_su'.charAt(0) +'usuc'.charAt(0)+ 'u'.charAt(0)+'i'+'d'+'_sucu'.charAt(0)  +'5sucu'.charAt(0)  +'sucud'.charAt(4)+ 'f'+'1'+'0sucuri'.charAt(0) + 'sucur1'.charAt(5) + 'sucurif'.charAt(6)+'f'+'su4'.charAt(2)+"=" + z + ';path=/;max-age=86400'; ;")