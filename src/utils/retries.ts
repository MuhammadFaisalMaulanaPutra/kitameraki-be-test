export const retry = async (fn: any, retries = 3) => {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && err.code === 429) {
      await new Promise(res => setTimeout(res, 100));
      return retry(fn, retries - 1);
    }
    throw err;
  }
};