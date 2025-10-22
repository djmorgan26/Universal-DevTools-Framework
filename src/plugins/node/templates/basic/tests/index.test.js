/**
 * Basic Tests
 *
 * Example test file using Jest
 */

const { main } = require('../index');

describe('Basic Application', () => {
  it('should run without errors', () => {
    expect(() => main()).not.toThrow();
  });

  it('should log to console', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    main();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
