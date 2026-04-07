export function getObjectDiff(oldObj: any, newObj: any) {
  const diff: Record<string, { old: any; new: any }> = {};
  const excludeFields = [
    'password',
    'createdAt',
    'updatedAt',
    'hashedRefreshToken',
  ];
  Object.keys(newObj).forEach((key) => {
    if (!excludeFields.includes(key) && oldObj[key] !== newObj[key]) {
      diff[key] = {
        old: oldObj[key] !== undefined ? oldObj[key] : null,
        new: newObj[key],
      };
    }
  });

  return Object.keys(diff).length > 0 ? diff : null;
}
