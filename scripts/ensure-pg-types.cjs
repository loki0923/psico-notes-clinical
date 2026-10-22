/**
 * Script de integridad y auto-remediación para pg-types en entornos Linux/Render.
 * Asegura la presencia física de los parsers y compatibilidad de mayúsculas/minúsculas.
 */
const fs = require('fs');
const path = require('path');

function ensurePgTypes() {
    try {
        const rootDir = path.resolve(__dirname, '..');
        const targetDir = path.join(rootDir, 'node_modules', 'pg-types');
        const targetLibDir = path.join(targetDir, 'lib');
        const vendorDir = path.join(rootDir, 'vendor', 'pg-types');
        const vendorLibDir = path.join(vendorDir, 'lib');

        if (!fs.existsSync(vendorDir)) {
            return;
        }

        if (!fs.existsSync(targetLibDir)) {
            fs.mkdirSync(targetLibDir, { recursive: true });
        }

        // Copiar archivos base
        const filesToSync = [
            { from: path.join(vendorDir, 'index.js'), to: path.join(targetDir, 'index.js') },
            { from: path.join(vendorDir, 'package.json'), to: path.join(targetDir, 'package.json') },
            { from: path.join(vendorLibDir, 'arrayParser.js'), to: path.join(targetLibDir, 'arrayParser.js') },
            { from: path.join(vendorLibDir, 'binaryParsers.js'), to: path.join(targetLibDir, 'binaryParsers.js') },
            { from: path.join(vendorLibDir, 'builtins.js'), to: path.join(targetLibDir, 'builtins.js') },
            { from: path.join(vendorLibDir, 'textParsers.js'), to: path.join(targetLibDir, 'textParsers.js') }
        ];

        for (const f of filesToSync) {
            if (fs.existsSync(f.from)) {
                fs.copyFileSync(f.from, f.to);
            }
        }

        // Crear alias en minúsculas para tolerancia estricta a sistemas de archivos sensibles a mayúsculas (Linux ext4)
        const aliases = [
            { src: 'textParsers.js', alias: 'textparsers.js' },
            { src: 'binaryParsers.js', alias: 'binaryparsers.js' },
            { src: 'arrayParser.js', alias: 'arrayparser.js' }
        ];

        for (const a of aliases) {
            const srcPath = path.join(targetLibDir, a.src);
            const aliasPath = path.join(targetLibDir, a.alias);
            if (fs.existsSync(srcPath) && !fs.existsSync(aliasPath)) {
                try {
                    fs.copyFileSync(srcPath, aliasPath);
                } catch {}
            }
        }

        // Asegurar "type": "commonjs" en package.json de pg-types
        const pkgPath = path.join(targetDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.type !== 'commonjs') {
                    pkg.type = 'commonjs';
                    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
                }
            } catch {}
        }

        console.log('✅ [Pre-flight] Módulo pg-types verificado y asegurado para Linux/Render');
    } catch (err) {
        console.warn('⚠️ [Pre-flight] Aviso asegurando pg-types:', err.message);
    }
}

if (require.main === module) {
    ensurePgTypes();
}

module.exports = { ensurePgTypes };
