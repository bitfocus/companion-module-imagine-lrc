module.exports = {
    initVariables: function () {

        let self = this;

        const variables = [];

        self.state.destinations.forEach((new_dest) => {

            const varID = (self.config['crosspoint_format'] === 'numbers') ?
                `dest_${new_dest.id}_source` :
                `dest__${new_dest.label.replaceAll(' ','_')}__source` ;

            variables.push({
            	variableId: varID,
            	name: `Dest Status: ${new_dest.label}`,
            });
        });

        self.setVariableDefinitions(variables);

        self.log(
            'debug',
            `Published variables for ${variables.length} destinations.`
        )
    },

    updateVariables: function (updated_dests) {

        let self = this;

        const variablesToUpdate = {};

        updated_dests.forEach((target) => {

            const varID = (self.config['crosspoint_format'] === 'numbers') ?
                `dest_${target.id}_source` :
                `dest__${target.label.replaceAll(' ','_')}__source` ;

            variablesToUpdate[varID] = target.source;
        });

        self.setVariableValues(variablesToUpdate)
    },
}