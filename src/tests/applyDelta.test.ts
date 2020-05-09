import { applyDelta, Delta } from '../framework/Delta';

interface OneProp {
    prop1: string;
}

interface MaybeTwoProps extends OneProp {
    prop2?: string;
}

interface Parent {
    child: MaybeTwoProps;
}

test('delta overwrites empty object', () => {
    const src: Partial<OneProp> = {};

    applyDelta(src, {
        prop1: 'thingy',
    });

    expect(src).toHaveProperty('prop1');
    expect(src.prop1).toEqual('thingy');
    expect(Object.keys(src).length).toEqual(1);
});

test('delta overwrites existing property', () => {
    const src: OneProp = {
        prop1: 'old'
    };

    applyDelta(src, {
        prop1: 'new',
    });

    expect(src).toHaveProperty('prop1');
    expect(src.prop1).toEqual('new');
    expect(Object.keys(src).length).toEqual(1);
});

test('delta adds new property', () => {
    const src: MaybeTwoProps = {
        prop1: 'existing'
    };

    applyDelta(src, {
        prop2: 'new',
    });

    expect(src).toHaveProperty('prop1');
    expect(src).toHaveProperty('prop2');
    expect(src.prop1).toEqual('existing');
    expect(src.prop2).toEqual('new');
    expect(Object.keys(src).length).toEqual(2);
});

test('delta removes property', () => {
    const src: MaybeTwoProps = {
        prop1: 'existing',
        prop2: 'remove'
    };

    applyDelta(src, {
        prop2: undefined,
    });

    expect(src).toHaveProperty('prop1');
    expect(src).not.toHaveProperty('prop2');
    expect(src.prop1).toEqual('existing');
    expect(Object.keys(src).length).toEqual(1);
});

test('delta adds property to child', () => {
    const src: Parent = {
        child: {
            prop1: 'one',
        }
    };

    applyDelta(src, {
        child: {
            prop2: 'two',
        }
    });

    expect(src).toHaveProperty('child');
    expect(src.child).toHaveProperty('prop1');
    expect(src.child).toHaveProperty('prop2');
    expect(src.child.prop1).toEqual('one');
    expect(src.child.prop2).toEqual('two');
    expect(Object.keys(src).length).toEqual(1);
    expect(Object.keys(src.child).length).toEqual(2);
});

test('delta overwrites property on child', () => {
    const src: Parent = {
        child: {
            prop1: 'old',
        }
    };

    applyDelta(src, {
        child: {
            prop1: 'new',
        }
    });

    expect(src).toHaveProperty('child');
    expect(src.child).toHaveProperty('prop1');
    expect(src.child.prop1).toEqual('new');
    expect(Object.keys(src).length).toEqual(1);
    expect(Object.keys(src.child).length).toEqual(1);
});

test('delta removes property from child', () => {
    const src: Parent = {
        child: {
            prop1: 'blah',
            prop2: 'existing',
        }
    };

    applyDelta(src, {
        child: {
            prop2: undefined,
        }
    });

    expect(src).toHaveProperty('child');
    expect(src.child).not.toHaveProperty('prop2');
    expect(Object.keys(src).length).toEqual(1);
    expect(Object.keys(src.child).length).toEqual(1);
});