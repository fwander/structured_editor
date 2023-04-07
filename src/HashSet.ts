class HashSet<T>{
    private hash: (x: T) => string;
    private dict: {[x: string]: T} = {};

    constructor(hash: (x: T) => string) {
        this.hash = hash;
    }

    has(checking: T){
        let to_hash = this.hash(checking);
        if (this.dict[to_hash] !== undefined) {
            return true;
        }
        return false;
    }

    add(to_add: T) {
        let to_hash = this.hash(to_add);
        if (this.dict[to_hash] !== undefined) {
            return;
        }
        this.dict[to_hash] = to_add;
    }

    remove(to_remove: T) {
        let to_hash = this.hash(to_remove);
        if (this.dict[to_hash] !== undefined) {
            delete this.dict[to_hash];
        }
    }

    to_array(): T[] {
        return Object.values(this.dict);
    }
};

export default HashSet;