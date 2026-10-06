import { classNames } from "./classNames"

describe('ClassNames', () => {
    test('een class', () => {
        expect(classNames('someclass')).toBe('someclass')
    })
    test('class met array', () => {
        expect(classNames('someclass', {}, ['class1', 'class2'])).toBe('someclass class1 class2')
    })
    test('complete class function', () => {
        expect(classNames('someclass', { hovered: true, scroll: false }, ['class1', 'class2'])).toBe('someclass class1 class2 hovered')
    })
})