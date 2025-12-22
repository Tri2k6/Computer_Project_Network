import * as path from 'path';

/**
 * Get __dirname equivalent for ES modules, compatible with pkg
 * Uses process.execPath when in pkg, otherwise uses a workaround
 */
export function getDirname(): string {
    // Check if running in pkg first (pkg sets this at build time)
    // @ts-ignore - process.pkg may not exist in all environments
    if ((process as any).pkg) {
        return path.dirname(process.execPath);
    }
    
    // When not in pkg, we need to get the directory of the current file
    // Since we can't use import.meta in a way pkg likes, we'll use process.cwd()
    // as a fallback. In development, the working directory should be the Gateway folder
    // or we can use an environment variable
    const envDir = process.env.GATEWAY_DIR;
    if (envDir) {
        return envDir;
    }
    
    // For development, assume we're running from Gateway directory
    // or use process.cwd() which should work for most cases
    return process.cwd();
}


