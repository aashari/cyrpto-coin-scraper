module.exports = {
    sortAoB: function(arrayOfObject, sortByKey) {
        arrayOfObject.sort(function(a, b) {
            var keyA = new Date(a[sortByKey]),
                keyB = new Date(b[sortByKey]);
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        return arrayOfObject;
    },
    duplicationRemoval: function(arrayOfObject, removeByKey) {
        var obj = {};
        for (var i = 0, len = arrayOfObject.length; i < len; i++) {
            obj[arrayOfObject[i][removeByKey]] = arrayOfObject[i];
        }
        arrayOfObject = [];
        for (var key in obj) {
            arrayOfObject.push(obj[key]);
        }
        return arrayOfObject;
    }
};