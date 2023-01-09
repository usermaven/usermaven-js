import {_bind_instance_methods, _each, _eachArray, _extend, _includes, _isUndefined, _trim} from "../../src/utils";

describe("Utils", () => {
  describe("_eachArray", () => {
    it('iterates over the elements of an array and applies the provided function to each element', () => {
      const arr = [1, 2, 3];
      const spy = jest.fn();
      _eachArray(arr, spy);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('_trim', () => {
    it('should remove leading and trailing whitespace from a string', () => {
      const result = _trim('   test string   ');
      expect(result).toBe('test string');
    });

    it('should remove leading and trailing non-breaking spaces from a string', () => {
      const result = _trim('\u00A0\u00A0\u00A0test string\u00A0\u00A0\u00A0');
      expect(result).toBe('test string');
    });

    it('should remove leading and trailing tab characters from a string', () => {
      const result = _trim('\t\ttest string\t\t');
      expect(result).toBe('test string');
    });

    it('should return an empty string for an all-whitespace input', () => {
      const result = _trim('   \t\t\u00A0\u00A0\u00A0');
      expect(result).toBe('');
    });
  });

  describe('_bind_instance_methods', () => {
    it('should bind all instance methods to the object', () => {
      const obj = {
        name: 'test object',
        getName: function () {
          return this.name;
        },
        setName: function (name: string) {
          this.name = name;
        }
      };

      _bind_instance_methods(obj);

      expect(obj.getName.name).toBe('bound getName');
      expect(obj.setName.name).toBe('bound setName');
    });

    it('should not bind non-function properties', () => {
      const obj = {
        name: 'test object',
        getName: function () {
          return this.name;
        },
        age: 30
      };

      _bind_instance_methods(obj);

      expect(obj.getName.name).toBe('bound getName');
      expect(obj.age).toBe(30);
    });
  });

  describe('_each', () => {
    it('should iterate over each element in an array', () => {
      const arr = [1, 2, 3]
      const result = []
      _each(arr, (val) => result.push(val))
      expect(result).toEqual(arr)
    })

    it('should iterate over each key-value pair in an object', () => {
      const obj = {a: 1, b: 2, c: 3}
      const result = []
      _each(obj, (val, key) => result.push([key, val]))
      expect(result).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    })
  })
  describe('_extend', () => {
    it('should extend an object with the properties of other objects', () => {
      const obj1 = {a: 1, b: 2}
      const obj2 = {b: 3, c: 4}
      const obj3 = {c: 5, d: 6}
      expect(_extend({}, obj1, obj2, obj3)).toEqual({a: 1, b: 3, c: 5, d: 6})
    })

    it('should overwrite properties with the same name in later objects', () => {
      const obj1 = {a: 1, b: 2}
      const obj2 = {b: 3, c: 4}
      expect(_extend({}, obj1, obj2)).toEqual({a: 1, b: 3, c: 4})
    })

    it('should not add undefined properties', () => {
      const obj1 = {a: 1, b: 2}
      const obj2 = {b: undefined, c: undefined}
      expect(_extend({}, obj1, obj2)).toEqual({a: 1, b: 2})
    })
  })

  describe('_includes', () => {
    it('should return true if the needle is found in the array or string', () => {
      expect(_includes([1, 2, 3], 2)).toBe(true)
      expect(_includes('abc', 'b')).toBe(true)
    })

    it('should return false if the needle is not found in the array or string', () => {
      expect(_includes([1, 2, 3], 4)).toBe(false)
      expect(_includes('abc', 'd')).toBe(false)
    })

  })


  describe('_isUndefined', () => {
    it('should return true for undefined', () => {
      expect(_isUndefined(undefined)).toBe(true)
    })

    it('should return false for everything else', () => {
      expect(_isUndefined(null)).toBe(false)
      expect(_isUndefined('')).toBe(false)
      expect(_isUndefined(0)).toBe(false)
      expect(_isUndefined([])).toBe(false)
      expect(_isUndefined({})).toBe(false)
      expect(_isUndefined(() => {
      })).toBe(false)
    })
  })
});
