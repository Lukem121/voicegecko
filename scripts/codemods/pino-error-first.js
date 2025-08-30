/**
 * Codemod: Swap Pino log.error argument order
 * Before: log.error('message', error)
 * After:  log.error(error, 'message')
 *
 * Scope:
 * - Only transforms calls where:
 *   - callee is log.error
 *   - exactly 2 arguments are passed
 *   - first arg is a string literal or template literal
 *   - second arg is a simple identifier (e.g., error, err, e, unknownError)
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'log' },
        property: { type: 'Identifier', name: 'error' },
      },
    })
    .forEach((path) => {
      const args = path.node.arguments;
      if (!Array.isArray(args) || args.length !== 2) return;
      const [firstArg, secondArg] = args;

      const isStringLike =
        (firstArg.type === 'Literal' && typeof firstArg.value === 'string') ||
        firstArg.type === 'TemplateLiteral';
      const isIdentifier = secondArg.type === 'Identifier';

      if (isStringLike && isIdentifier) {
        // Swap the arguments: error first, message second
        path.node.arguments = [secondArg, firstArg];
      }
    });

  return root.toSource({ quote: 'single' });
};
