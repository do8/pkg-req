function cache_construct() {
    return new Proxy(function () { return cache_construct() }, {
        construct(target, args) {
            return cache_construct()
        },
        get: function (target, prop) {
            if (!target[prop]) target[prop] = {}
            else if (target[prop].max_length && Object.keys(target[prop]).length > target[prop].max_length) target[prop] = {}
            else if (Object.keys(target[prop]).length > 1000) target[prop] = {}
            return target[prop]
        }//, set: function (target, prop, value) { }
    })
}
module.exports = cache_construct()

