/**
 * Get an environment variable using provess.env (use for mandatory environment variables).
 * @throws Throws an `Error` if the environment variable is not set.
 * @param name The name of the environment variable.
 * @returns The environment variable's value.
 */
export function getEnv(name: string): string {
    const value = process.env[name];

    if (value === undefined)
        throw new Error(`Mandatory environment variable ${name} is not set.`);

    return value;
}
