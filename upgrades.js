module.exports = {
    upgrade_v1_1_1: function(context, config, actions, feedbacks) {
        let changed = false
        if (!config.hasOwnProperty('crosspoint_format')) {
            // Crosspoint format isn't set, apply a default (numbers)
            config.crosspoint_format = 'numbers'
            changed = true
        }

        return changed
    },
}