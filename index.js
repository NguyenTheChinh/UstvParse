let originalRules = require('./rules.json');
let requestPromise = require('request-promise');
let bodyParser = require('body-parser');

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
})

app.post('/', async (req, res) => {
  if (req.body.url) {
    let link = await getLink(req.body.url).catch(ref => {

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

function getLink(link) {
  return new Promise(async resolve => {
    try {
      let Link = link;
      let tempResult;
      let rules = JSON.parse(JSON.stringify(originalRules));
      for (let i = 0; i < rules.Rules.length; i++) {
        let rule = rules.Rules[i];
        if (Link.indexOf(rule.Match) !== -1) {
          console.log(rule.Name);
          for (let j = 0; j < rule.Stages.length; j++) {
            let stage = rule.Stages[j];
            console.log(stage.Id, stage.Action);
            switch (stage.Action) {
              case "CONCAT":

                // duyệt mảng thay các chuỗi bắt đầu bằng giá trị biến
                stage.Targets.forEach((target, index) => {
                  if (target.match(/^\$\w+$/)) {
                    stage.Targets[index] = eval(target.match(/\w+/)[0]);
                  }
                });

                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(stage.Targets.join(""))}`);
                break;

              case "EVAL":
                stage.String = eval(stage.String.match(/\w+/)[0]);
                tempResult = eval(stage.String);
                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
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

                let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "g");
                tempResult = stage.In.replace(replaceRegex, stage.To);
                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
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
                  headers: {}
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
                  console.log(htmlString);
                  eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
                  requestSucess = true;
                })
                  .catch(function (err) {
                    requestSucess = false;
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
                if (matchString.match(matchRegex)) tempResult = matchString.match(matchRegex)[0];
                else {
                  tempResult = stage.Default || "";
                }

                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
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

// eval(`Link = "http://www.b4ucast.me/crichd.php?player=desktop&live=bt1&vw=620&vh=490__requestHeader=Referer::http://free.crichd.online/embed2.php?id=btsp1"`);
//
// let tempResult;
// (async () => {
//   let rules = JSON.parse(JSON.stringify(originalRules));
//   for (let i = 0; i < rules.Rules.length; i++) {
//     let rule = rules.Rules[i];
//     if (Link.indexOf(rule.Match) !== -1) {
//       console.log(rule.Name);
//       for (let j = 0; j < rule.Stages.length; j++) {
//         let stage = rule.Stages[j];
//         console.log(stage.Id, stage.Action);
//         switch (stage.Action) {
//           case "CONCAT":
//
//             // duyệt mảng thay các chuỗi bắt đầu bằng giá trị biến
//             stage.Targets.forEach((target, index) => {
//               if (target.match(/^\$\w+$/)) {
//                 stage.Targets[index] = eval(target.match(/\w+/)[0]);
//               }
//             });
//
//             eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(stage.Targets.join(""))}`);
//             break;
//
//           case "EVAL":
//             stage.String = eval(stage.String.match(/\w+/)[0]);
//             tempResult = eval(stage.String);
//             eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
//             break;
//
//           case "REPLACE":
//             let string = stage.In;
//             if (stage.In.match(/^\$\w+$/)) {
//               stage.In = eval(stage.In.match(/\w+/)[0]);
//               string = stage.In;
//             }
//             if (stage.From.match(/^\$\w+$/)) {
//               stage.From = eval(stage.From.match(/\w+/)[0]);
//             }
//             if (stage.To.match(/^\$\w+$/)) {
//               stage.To = eval(stage.To.match(/\w+/)[0]);
//             }
//             let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "g");
//             tempResult = string.replace(replaceRegex, stage.To);
//             eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
//             break;
//
//           case "GET":
//             let requestUrl = stage.Link;
//             if (stage.Link.match(/^\$\w+$/)) {
//               requestUrl = eval(stage.Link.match(/\w+/)[0]);
//             }
//             let options = {
//               uri: requestUrl,
//               headers: {}
//             };
//             let headers = stage.Headers;
//             if (stage.Headers.match(/^\$\w+$/)) {
//               headers = eval(stage.Headers.match(/\w+/)[0]);
//             }
//             headers = headers.split("::");
//             headers.forEach((headerValue, index) => {
//               if (index % 2 == 0) options.headers[headerValue] = "";
//               else options.headers[headers[index - 1]] = headerValue;
//             });
//
//             await requestPromise(options).then(function (htmlString) {
//               console.log(htmlString);
//               eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
//             })
//               .catch(function (err) {
//                 throw err;
//               });
//             break;
//
//           case "MATCH":
//             let matchString = stage.Target;
//             if (stage.Target.match(/^\$\w+$/)) {
//               matchString = eval(stage.Target.match(/\w+/)[0]);
//             }
//
//             if (stage.String.match(/^\$\w+$/)) {
//               stage.String = eval(stage.String.match(/\w+/g)[0]);
//             }
//
//             if (stage.Default.match(/^\$\w+$/)) {
//               stage.Default = eval(stage.Default.match(/\w+/g)[0]);
//             }
//
//             if (stage.MatchId.match(/^\$\w+$/)) {
//               stage.MatchId = eval(stage.MatchId.match(/\w+/g)[0]);
//             }
//
//             if (stage.GroupId.match(/^\$\w+$/)) {
//               stage.GroupId = eval(stage.GroupId.match(/\w+/g)[0]);
//             }
//
//             const matchRegex = new RegExp(`${stage.String}`, "g");
//             if (matchString.match(matchRegex)) tempResult = matchString.match(matchRegex)[0];
//             else {
//               tempResult = stage.Default;
//             }
//
//             eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
//             break;
//           case "FINAL":
//             console.log(eval(stage.Result.match(/\w+/)[0]));
//             break;
//         }
//       }
//     }
//   }
// })();

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decode(first, second) {
  var e = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(first))), o = CryptoJS.enc.Hex.parse(e.salt),
    p = CryptoJS.enc.Hex.parse(e.iv), a = e.ciphertext, S = parseInt(e.iterations);
  S <= 0 && (S = 999);
  var i = 256 / 4, n = CryptoJS.PBKDF2(second, o, {hasher: CryptoJS.algo.SHA512, keySize: i / 8, iterations: S});
  return CryptoJS.AES.decrypt(a, n, {mode: CryptoJS.mode.CBC, iv: p}).toString(CryptoJS.enc.Utf8)
}