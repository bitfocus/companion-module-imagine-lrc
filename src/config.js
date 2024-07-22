const { Regex } = require('@companion-module/base')
module.exports = {
    getConfigFields() {
        return [
            {
                type: 'textinput',
                id: 'host',
                label: 'IP Address',
                width: 6,
                default: '192.168.0.100',
                regex: Regex.IP,
                required: true,
            },
            {
                type: 'textinput',
                id: 'port',
                label: 'Port',
                width: 6,
                default: '52116',
                regex: Regex.PORT,
            },
            {
                type: 'number',
                id: 'user_id',
                label: 'User ID',
                width: 3,
                min: 0,
                max: 65535,
                default: 0,
                required: true,
                tooltip: 'Numeric identifier for any commands requiring this parameter (e.g. LOCK, PROTECT, XBUFFER)',
            },
            {
                type: 'number',
                id: 'salvo_count',
                label: 'Salvo Count',
                width: 3,
                min: 1,
                max: 65535,
                default: 24,
                required: true,
                tooltip: 'Number of salvos to query from the router (range from 0 to n)',
            },
            {
                type: 'checkbox',
                id: 'allow_empty_xpoint_dest',
                label: 'Allow Empty Crosspoint Destination',
                width: 6,
                default: false,
                tooltip: 'Safeguard to prevent routing a single source to every destination in a single crosspoint command',
            },
            {
                type: 'dropdown',
                id: 'crosspoint_format',
                label: 'Crosspoint Format',
                width: 6,
                default: 'numbers',
                choices: [
                    { id: 'numbers', label: 'Numbers' },
                    { id: 'names', label: 'Names' },
                ],
                tooltip: 'Sets sources/destinations used in crosspoint commands to be sent as either numbers (default)' +
                    ' or names. If you use a variable in the respective fields, you should set this to the same format' +
                    ' as your variable values as the values will be sent unmodified.',
            }
        ]
    }
}