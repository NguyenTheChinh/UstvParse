let originalRules = require('./rules.json');
let searchRules = require('./search_rules');
let requestPromise = require('request-promise').defaults({jar: true});
let bodyParser = require('body-parser');
const util = require("util");

const express = require('express');
const app = express();
const port = 3001;
app.use(bodyParser.urlencoded());

app.use(bodyParser.json());

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`server is listening on ${port}`);
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

let debugIds = [10];

function getLink(link) {
    let parseLogs = [];
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
                                console.log(JSON.stringify(stage.Targets.join("")));
                                break;

                            case "EVAL":
                                if (stage.String.match(/^\$\w+$/)) {
                                    stage.String = eval(stage.String.match(/\w+/)[0]);
                                } else stage.String = eval(stage.String);
                                console.log(stage.String);
                                tempResult = eval(stage.String);
                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(tempResult)}`);
                                console.log(tempResult);
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
                                console.log(tempResult);
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
                                    encoding: 'utf-8',
                                    headers: {},
                                    resolveWithFullResponse: true,
                                    gzip: true
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
                                // if (!requestSucess) return resolve(false);
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
                                stage.Params = stage.Params.split("::");
                                let formData = {};
                                for (let i = 0; i < stage.Params.length; i += 2) {
                                    let key = stage.Params[i];
                                    formData[key] = stage.Params[i + 1];
                                }

                                let postOptions = {
                                    method: 'POST',
                                    uri: stage.Link,
                                    headers: {},
                                    body: stage.Params.map((value, index) => {
                                        if (index % 2 === 0) return `${value}=`;
                                        else return `${value}${index === stage.Params.length - 1 ? "" : "&"}`;
                                    }).join(""),
                                    gzip: true,
                                    // formData,
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
                                    eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(htmlString)}`);
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

                                tempResult = stage.Default || "";
                                let matchRegex = new RegExp(`${stage.String}`, "g");
                                let matchId = 0, match;
                                while ((match = matchRegex.exec(matchString)) !== null) {
                                    if (matchId == stage.MatchId) {
                                        tempResult = match[stage.GroupId];
                                        // break;
                                    }
                                    matchId++;
                                }

                                console.log(tempResult);
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

app.get('/search', async function (req, res) {
    if (!req.query.link) {
        res.send('thiếu trường link')
    } else res.send((await searchLink(req.query.query, req.query.link)));
});

function searchLink(query, Link) {
    return new Promise(async resolve => {
        try {
            let goto;
            let tempResult;
            let rules = JSON.parse(JSON.stringify(searchRules));
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
                                console.log(stage.String);
                                tempResult = eval(stage.String);
                                eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(tempResult)}`);
                                console.log(tempResult);
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
                                    resolveWithFullResponse: true,
                                    gzip: true
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
                                stage.Params = stage.Params.split("::");

                                let postOptions = {
                                    method: 'POST',
                                    uri: stage.Link,
                                    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                                    body: stage.Params.map((value, index) => {
                                        if (index % 2 === 0) return `${value}=`;
                                        else return `${value}&`;
                                    }).join(""),
                                    gzip: true
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
                                    eval(`${stage.Result.match(/\w+/)[0]} = ${JSON.stringify(htmlString)}`);
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

                                tempResult = stage.Default || "";
                                let matchRegex = new RegExp(`${stage.String}`, "g");
                                let matchId = 0, match;
                                while ((match = matchRegex.exec(matchString)) !== null) {
                                    if (matchId == stage.MatchId) {
                                        tempResult = match[stage.GroupId];
                                        break;
                                    }
                                    matchId++;
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
    });
}

function sortStageId(stages) {
    let temp = JSON.parse(JSON.stringify(stages));
    if (!Array.isArray(stages) && stages.hasOwnProperty("Stages")) {
        temp = JSON.parse(JSON.stringify(stages.Stages));
    }

    temp = temp.map((stage, index) => {
        stage.Id = index + 1;
        return stage;
    });
    if (stages.hasOwnProperty("Stages")) {
        stages.Stages = temp;

        require('child_process').spawn('clip').stdin.end(util.inspect(JSON.stringify(stages, null, 2)));
        return stages;
    } else {
        require('child_process').spawn('clip').stdin.end(util.inspect(JSON.stringify(temp, null, 2)));
        return temp;
    }
}

// let rules = require("./rules.json");
// const fs = require("fs");
// for (let i = 0; i < rules.Rules.length; i++) {
//     let rule = rules.Rules[i];
//     let hasGoto = rule.Stages.find(stage => stage.Action === "GOTO");
//     if (hasGoto) {
//         console.log(rule.Match);
//     } else {
//         rule.Stages = sortStageId(rule.Stages);
//     }
// }
// fs.writeFileSync("./rules.json", JSON.stringify(rules, null, 2))
