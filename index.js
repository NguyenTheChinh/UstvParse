let rules = require('./rules.json');
let requestPromise = require('request-promise');

const express = require('express');
const app = express();
const port = 3000;

app.listen(port, (err) => {
  if (err) throw err;
  console.log(`server is listening on ${port}`);
});

app.get('/', async (req, res) => {
  if (req.query.url) {
    let Link = req.query.url;
    let tempResult;
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
              let string = stage.In;
              if (stage.In.match(/^\$\w+$/)) {
                stage.In = eval(stage.In.match(/\w+/)[0]);
                string = stage.In;
              }
              if (stage.From.match(/^\$\w+$/)) {
                stage.From = eval(stage.From.match(/\w+/)[0]);
              }
              if (stage.To.match(/^\$\w+$/)) {
                stage.To = eval(stage.To.match(/\w+/)[0]);
              }
              let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "g");
              tempResult = string.replace(replaceRegex, stage.To);
              eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
              break;

            case "GET":
              let requestUrl = stage.Link;
              if (stage.Link.match(/^\$\w+$/)) {
                requestUrl = eval(stage.Link.match(/\w+/)[0]);
              }
              let options = {
                uri: requestUrl,
                headers: {}
              };
              let headers = stage.Headers;
              if (stage.Headers.match(/^\$\w+$/)) {
                headers = eval(stage.Headers.match(/\w+/)[0]);
              }
              headers = headers.split("::");
              headers.forEach((headerValue, index) => {
                if (index % 2 == 0) options.headers[headerValue] = "";
                else options.headers[headers[index - 1]] = headerValue;
              });

              await requestPromise(options).then(function (htmlString) {
                console.log(htmlString);
                eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
              })
                .catch(function (err) {
                  throw err;
                });
              break;

            case "MATCH":
              let matchString = stage.Target;
              if (stage.Target.match(/^\$\w+$/)) {
                matchString = eval(stage.Target.match(/\w+/)[0]);
              }

              if (stage.String.match(/^\$\w+$/)) {
                stage.String = eval(stage.String.match(/\w+/g)[0]);
              }

              if (stage.Default.match(/^\$\w+$/)) {
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
                tempResult = stage.Default;
              }

              eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
              break;
            case "FINAL":
              res.send(eval(stage.Result.match(/\w+/)[0]));
              break;
          }
        }
      }
    }
  } else {
    res.send("Thiếu đường dẫn");
  }
});


eval(`Link = "http://www.b4ucast.me/crichd.php?player=desktop&live=bt1&vw=620&vh=490__requestHeader=Referer::http://free.crichd.online/embed2.php?id=btsp1"`);

let tempResult;
(async () => {
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
            let string = stage.In;
            if (stage.In.match(/^\$\w+$/)) {
              stage.In = eval(stage.In.match(/\w+/)[0]);
              string = stage.In;
            }
            if (stage.From.match(/^\$\w+$/)) {
              stage.From = eval(stage.From.match(/\w+/)[0]);
            }
            if (stage.To.match(/^\$\w+$/)) {
              stage.To = eval(stage.To.match(/\w+/)[0]);
            }
            let replaceRegex = new RegExp(`${escapeRegExp((stage.From))}`, "g");
            tempResult = string.replace(replaceRegex, stage.To);
            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
            break;

          case "GET":
            let requestUrl = stage.Link;
            if (stage.Link.match(/^\$\w+$/)) {
              requestUrl = eval(stage.Link.match(/\w+/)[0]);
            }
            let options = {
              uri: requestUrl,
              headers: {}
            };
            let headers = stage.Headers;
            if (stage.Headers.match(/^\$\w+$/)) {
              headers = eval(stage.Headers.match(/\w+/)[0]);
            }
            headers = headers.split("::");
            headers.forEach((headerValue, index) => {
              if (index % 2 == 0) options.headers[headerValue] = "";
              else options.headers[headers[index - 1]] = headerValue;
            });

            await requestPromise(options).then(function (htmlString) {
              console.log(htmlString);
              eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(htmlString)}`);
            })
              .catch(function (err) {
                throw err;
              });
            break;

          case "MATCH":
            let matchString = stage.Target;
            if (stage.Target.match(/^\$\w+$/)) {
              matchString = eval(stage.Target.match(/\w+/)[0]);
            }

            if (stage.String.match(/^\$\w+$/)) {
              stage.String = eval(stage.String.match(/\w+/g)[0]);
            }

            if (stage.Default.match(/^\$\w+$/)) {
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
              tempResult = stage.Default;
            }

            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(tempResult)}`);
            break;
          case "FINAL":
            console.log(eval(stage.Result.match(/\w+/)[0]));
            break;
        }
      }
    }
  }
})();

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}