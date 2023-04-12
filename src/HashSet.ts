class HashSet<T>{
    private hash: (x: T) => string;
    private dict: {[x: string]: T} = {};

    constructor(hash: (x: T) => string) {
        this.hash = hash;
    }

    // does not mutate
    copy() {
        let ret = new HashSet<T>(this.hash);
        for (const v of this.to_array()) {
            ret.add(v);
        }
        return ret;
    }

    // does not mutate
    has(checking: T){
        const to_hash = this.hash(checking);
        const find = this.dict[to_hash];
        return find;
    }

    // mutates
    intersect(to_intersect: HashSet<T>) {
        for (const v of this.to_array()) {
            if (to_intersect.has(v) === undefined) {
                this.remove(v);
            }
        }
        return this;
    }

    // mutates
    union(to_concat: HashSet<T>) {
        for (const v of to_concat.to_array()) {
            this.add(v);
        }
        return this;
    }

    // mutates
    add(to_add: T) {
        let to_hash = this.hash(to_add);
        if (this.dict[to_hash] !== undefined) {
            return this;
        }
        this.dict[to_hash] = to_add;
        return this;
    }

    // mutates
    remove(to_remove: T) {
        let to_hash = this.hash(to_remove);
        if (this.dict[to_hash] !== undefined) {
            delete this.dict[to_hash];
        }
        return this;
    }

    // does not mutate
    to_array(): T[] {
        return Object.values(this.dict);
    }

    // does not mutate
    is_empty(): boolean {
        return this.dict.length === 0;
    }
};

export default HashSet;