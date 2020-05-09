import { applyDelta, Delta } from '../framework/Delta';

interface SingleProp {
    prop1: string;
}

interface TwoProps extends SingleProp {
    prop2?: string;
}

test('delta overwrites empty object', () => {
    const src: Partial<SingleProp> = {};

    applyDelta(src, {
        prop1: 'thingy',
    });

    expect(src).toHaveProperty('prop1');
    expect(src.prop1).toEqual('thingy');
    expect(Object.keys(src).length).toEqual(1);
});

test('delta overwrites existing property', () => {
    const src: SingleProp = {
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
    const src: TwoProps = {
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
    const src: TwoProps = {
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