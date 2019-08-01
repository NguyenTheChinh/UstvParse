let rules = require('./rules.json');
let request = require('request');
let requestPromise = require('request-promise');
// let Link = `http://www.b4ucast.me/crichd.php?player=desktop&live=bt1&vw=620&vh=490__requestHeader=Referer::http://free.crichd.online/embed2.php?id=btsp1`;
eval(`Link = "http://www.b4ucast.me/crichd.php?player=desktop&live=bt1&vw=620&vh=490__requestHeader=Referer::http://free.crichd.online/embed2.php?id=btsp1"`);

let result;
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
            stage.Targets.forEach((target, index) => {
              if (target.match(/^\$\w+$/)) {
                stage.Targets[index] = eval(target.match(/\w+/)[0]);
              }
            });

            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(stage.Targets.join(""))}`);
            // eval(stage.Result.match(/\w+/)[0] + "=" + "'"+stage.Targets.join("")+"'");
            break;
          case "EVAL":
            stage.String = eval(stage.String.match(/\w+/)[0]);
            result = eval(stage.String);
            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(result)}`);
            break;

          case "REPLACE":
            let string = stage.In;
            if (stage.In.match(/^\$\w+$/)) {
              string = eval(stage.In.match(/\w+/)[0]);
            }
            const regex = new RegExp(`${JSON.stringify(stage.From)}`, "g");
            result = string.replace(regex, stage.To);
            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(result)}`);
            break;
          case "GET":
            let requestUrl = stage.Link;
            if (stage.Link.match(/^\$\w+$/)) {
              requestUrl = eval(stage.Link.match(/\w+/)[0]);
            }
            var options = {
              uri: requestUrl,
              headers: {}
            };
            let headers = eval(stage.Headers.match(/\w+/)[0]);
            headers = headers.split("::");
            headers.forEach((headerValue, index) => {
              if (index % 2 == 0) options.headers[headerValue] = "";
              else options.headers[headers[index - 1]] = headerValue;
            });


            await requestPromise(options).then(function (htmlString) {
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
            const matchRegex = new RegExp(`${stage.String}`, "g");
            if (matchString.match(matchRegex)) result = matchString.match(matchRegex)[0];
            else result = stage.Default;
            // if(stage.Result.match(/\w+/)[0]==="function"){
            //   eval(`${stage.Result.match(/\w+/)[0]} ${JSON.stringify(result)}`);
            // } else
            eval(`${stage.Result.match(/\w+/)[0]}=${JSON.stringify(result)}`);
            break;
          case "FINAL":
            console.log(eval(stage.Result.match(/\w+/)[0]));
            break;
        }
      }
    }
  }
})();
