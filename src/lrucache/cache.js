class CacheNode {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}
class LruCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.head = new CacheNode();
        this.tail = new CacheNode();
        this.head.next = this.tail;
        this.tail.previous = this.head;
        this.map = new Map();
    }


    removeNode = function (node) {
        node.previous.next = node.next;
        node.next.previous = node.previous;
    }.bind(this);

    

    addNode = function (node) {
        this.head.next.previous = node;
        node.next = this.head.next;
        this.head.next = node;
        node.previous = this.head;
    }.bind(this);
    
    get = function (key) {
        const result = this.map.get(key);
        if (result != null) {
            this.removeNode(result);
            this.addNode(result);
            return result.value;
        }
        return undefined;
    }.bind(this);
    
    put = function (key, value) {
        const node = this.map.get(key);
        if (node != null) {
            console.log(`Object with key ${key} already in the cache!`)
            this.removeNode(node);
            node.value = value;
            this.map.set(key, node);
            this.addNode(node);
            return;
        }
        if (this.capacity === this.map.size) {
            console.log('cache overflow!')
            this.map.delete(this.tail.previous.key);
            this.removeNode(this.tail.previous);
        }
        const newNode = new CacheNode(key, value);
        this.addNode(newNode);
        this.map.set(key, newNode);
    }.bind(this);
}

module.exports = { LruCache }