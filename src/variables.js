module.exports = {
    initVariables: function () {

        let self = this;

        const variables = [];

        self.state.destinations.forEach((new_dest) => {

            const varID = (self.config['crosspoint_format'] === 'numbers') ?
                `output_${new_dest.id}_input` :
                `output_${new_dest.label.replaceAll(' ','_')}_input` ;

            variables.push({
            	variableId: varID,
            	name: `Dest '${new_dest.label}' Source Name`,
            },{
                variableId: varID + '_id',
                name: `Dest '${new_dest.label}' Source ID`,
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
                `output_${target.id}_input` :
                `output_${target.label.replaceAll(' ','_')}_input` ;

            variablesToUpdate[varID] = target.source;
            variablesToUpdate[varID+'_id'] = target.source_id;
        });

        self.setVariableValues(variablesToUpdate)
    },
}