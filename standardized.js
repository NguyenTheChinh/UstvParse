let rules = require("./rules.json");
const fs = require("fs");
const util = require("util");

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
for (let i = 0; i < rules.Rules.length; i++) {
    let rule = rules.Rules[i];
    let hasGoto = rule.Stages.find(stage => stage.Action === "GOTO");
    if (hasGoto) {
        console.log(rule.Match);
    } else {
        rule.Stages = sortStageId(rule.Stages);
    }
}
fs.writeFileSync("./rules.json", JSON.stringify(rules, null, 2))
