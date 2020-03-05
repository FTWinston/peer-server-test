// A delta is a partial of partials, that also allows "undefined" to remove objects
export type Delta<TState> = {
    [P in keyof TState]?: undefined | Partial<TState[P]>;
};

export function applyDelta<TState extends {}>(state: Partial<TState>, delta: Delta<TState>) {
    for (const key in delta) {
        const val = delta[key];
        if (val === undefined) {
            delete state[key];
            continue;
        }

        let newVal: any;

        if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            newVal = val; // if it's null, a primitive or an array, use it as-is
        }
        else {
            const prevVal = state[key];
            if (prevVal === undefined) {
                newVal = val;
            }
            else {
                newVal = {
                    ...prevVal,
                    ...val,
                };
            }
        }

        state[key] = newVal;
    }
}