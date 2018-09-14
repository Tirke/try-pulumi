import * as cloud from '@pulumi/cloud'

// Table with route primary key
const counter = new cloud.Table('counter', 'route', 'string')
const api = new cloud.API('api')

// Retrieve current count, increase it, save the result
async function increaseCounter(route: String) {
    const value = await counter.get({route})
    const count = (value && value.count) || 0
    const nextCount = count + 1
    await counter.insert({route, count: nextCount})
    return nextCount
}

// Get handler on a proxy, meaning every api endpoint will trigger this lambda
api.get('/{route+}', async (req, res) => {
    const route = req.params.route

    const nextCount = await increaseCounter(route)
    res.status(200).json({route, count: nextCount})
})

// Export api endpoint
export const endpoint = `${api.publish().url}test`
