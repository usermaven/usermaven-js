import {_eachArray} from "../../src/utils";

describe("Utils", () => {
  describe("_eachArray", () => {
    it('iterates over the elements of an array and applies the provided function to each element', () => {
      const arr = [1, 2, 3];
      const spy = jest.fn();
      _eachArray(arr, spy);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });
});
