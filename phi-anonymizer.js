/**
 * PSICO NOTES CLINICAL v6.0 - MÓDULO DE ANONIMIZACIÓN ÉTICA PHI (Protected Health Information)
 * 
 * Desidentifica datos sensibles de pacientes (nombres, teléfonos, documentos, correos)
 * en el cliente antes de interactuar con modelos de IA (Google Gemini API).
 * Permite restaurar de forma bidireccional los datos originales para el profesional tratante.
 */

const PhiAnonymizer = {
    /**
     * Anonimiza un texto y contexto de paciente sustituyendo entidades por tokens criptográficos o simbólicos.
     * @param {string} text - Texto libre o apuntes clínicos a anonimizar.
     * @param {Object} patientInfo - Metadatos del paciente (nombre, teléfono, etc.).
     * @returns {{ anonymizedText: string, mapping: Object, summary: Object }}
     */
    anonymize(text, patientInfo = {}) {
        if (!text || typeof text !== 'string') {
            return { anonymizedText: '', mapping: {}, summary: { replacements: 0 } };
        }

        let result = text;
        const mapping = {};
        let replacementCount = 0;

        // 1. Identificar y sustituir nombre del paciente
        if (patientInfo.name && patientInfo.name.trim().length > 2) {
            const fullName = patientInfo.name.trim();
            const token = '[PACIENTE_PRINCIPAL]';
            mapping[token] = fullName;
            
            // Sustituir nombre completo
            const fullRegex = new RegExp(this.escapeRegExp(fullName), 'gi');
            if (fullRegex.test(result)) {
                result = result.replace(fullRegex, token);
                replacementCount++;
            }

            // Sustituir nombres individuales (primer nombre y apellido si tienen > 3 caracteres)
            const parts = fullName.split(/\s+/).filter(p => p.length > 2);
            parts.forEach((part, idx) => {
                const partToken = `[PACIENTE_NOMBRE_${idx + 1}]`;
                mapping[partToken] = part;
                const partRegex = new RegExp(`\\b${this.escapeRegExp(part)}\\b`, 'gi');
                if (partRegex.test(result)) {
                    result = result.replace(partRegex, partToken);
                    replacementCount++;
                }
            });
        }

        // 2. Anonimizar correos electrónicos
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        let emailIdx = 1;
        result = result.replace(emailRegex, (match) => {
            const token = `[CORREO_${emailIdx++}]`;
            mapping[token] = match;
            replacementCount++;
            return token;
        });

        // 3. Anonimizar números de teléfono (formatos internacionales y locales)
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
        let phoneIdx = 1;
        result = result.replace(phoneRegex, (match) => {
            // Evitar reemplazar números pequeños simples que no parezcan teléfonos
            const digits = match.replace(/\D/g, '');
            if (digits.length >= 7 && digits.length <= 15) {
                const token = `[TELEFONO_${phoneIdx++}]`;
                mapping[token] = match;
                replacementCount++;
                return token;
            }
            return match;
        });

        // 4. Anonimizar números de identificación / cédula / DNI
        const idRegex = /\b(?:CI|C\.I\.|DNI|CEDULA|PASAPORTE|RUT)[:\s]*([A-Z0-9.-]{5,15})\b/gi;
        let docIdx = 1;
        result = result.replace(idRegex, (match, docVal) => {
            const token = `[DOCUMENTO_ID_${docIdx++}]`;
            mapping[token] = match;
            replacementCount++;
            return token;
        });

        // 5. Contacto de emergencia registrado
        if (patientInfo.emergency && patientInfo.emergency.trim().length > 2) {
            const emName = patientInfo.emergency.trim();
            const token = '[CONTACTO_EMERGENCIA]';
            mapping[token] = emName;
            const emRegex = new RegExp(this.escapeRegExp(emName), 'gi');
            if (emRegex.test(result)) {
                result = result.replace(emRegex, token);
                replacementCount++;
            }
        }

        return {
            anonymizedText: result,
            mapping,
            summary: {
                replacements: replacementCount,
                tokensGenerated: Object.keys(mapping).length
            }
        };
    },

    /**
     * Restaura los tokens sustituidos por los valores reales del expediente en el cliente.
     * @param {string|Object} input - Texto o estructura JSON de notas a restaurar.
     * @param {Object} mapping - Mapeo token -> entidad real.
     * @returns {string|Object}
     */
    deanonymize(input, mapping = {}) {
        if (!input || !mapping || Object.keys(mapping).length === 0) {
            return input;
        }

        if (typeof input === 'string') {
            let restored = input;
            for (const [token, originalVal] of Object.entries(mapping)) {
                const regex = new RegExp(this.escapeRegExp(token), 'g');
                restored = restored.replace(regex, originalVal);
            }
            return restored;
        }

        // Si es un objeto estructurado (ej. nota SOAP { subjetivo, objetivo, analisis, plan })
        if (typeof input === 'object') {
            const restoredObj = Array.isArray(input) ? [] : {};
            for (const [key, val] of Object.entries(input)) {
                restoredObj[key] = this.deanonymize(val, mapping);
            }
            return restoredObj;
        }

        return input;
    },

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

if (typeof window !== 'undefined') {
    window.PhiAnonymizer = PhiAnonymizer;
} else if (typeof global !== 'undefined') {
    global.PhiAnonymizer = PhiAnonymizer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhiAnonymizer;
}
