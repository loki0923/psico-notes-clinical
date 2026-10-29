/**
 * PSICO NOTES CLINICAL - MÓDULO OFICIAL DE GENOGRAMA FAMILIAR SISTÉMICO
 * Estándar Internacional McGoldrick, Gerson & Petry / Teoría de Sistemas Familiares de Murray Bowen
 * 
 * Capacidades:
 * - Renderizado vectorial SVG interactivo de alta precisión
 * - Simbología estándar completa: 3+ generaciones, figuras anatómicas, estado vital y doble contorno para paciente índice
 * - Vínculos conyugales: matrimonio, convivencia, separación, divorcio
 * - Descendencia biológica, adoptiva y orden cronológico de hermanos
 * - Delimitación perimetral del hogar de convivencia (Household boundary)
 * - Pautas afectivas y relacionales de Bowen (fusión, conflicto, corte emocional, distancia, alianza)
 * - Marcadores psicomédicos y patologías transgeneracionales (adicciones, depresión, ansiedad, suicidio, etc.)
 * - Asistente de IA SERENA para detección de triangulaciones e hipótesis sistémicas
 * - Exportación de alta resolución en PNG y SVG para historias clínicas y peritajes
 */

const GenogramModule = {
    // Tipos de relaciones emocionales según Bowen
    RELATIONSHIP_TYPES: {
        harmonious: { label: 'Armónica / Cercana', color: '#10b981', stroke: '4', strokeDash: 'none', lines: 2, icon: 'fa-heart', desc: 'Vínculo cálido, apoyo mutuo y comunicación fluida' },
        enmeshed: { label: 'Fusionada / Muy Estrecha', color: '#0d9488', stroke: '6', strokeDash: 'none', lines: 3, icon: 'fa-link', desc: 'Sobreinvolucramiento emocional, límites difusos (Bowen)' },
        enmeshed_conflict: { label: 'Fusionada y Conflictiva', color: '#f59e0b', stroke: '5', strokeDash: 'none', lines: 3, zigzag: true, icon: 'fa-bolt', desc: 'Vínculo absorbente con alta reactividad y disputas recurrentes' },
        conflictual: { label: 'Conflictiva / Tensa', color: '#ef4444', stroke: '3', strokeDash: 'none', zigzag: true, lines: 1, icon: 'fa-fire', desc: 'Hostilidad manifiesta, discusiones frecuentes o tensión latente' },
        distant: { label: 'Distante / Fría', color: '#64748b', stroke: '2', strokeDash: '4,4', lines: 1, icon: 'fa-snowflake', desc: 'Contacto escaso, falta de calidez o indiferencia afectiva' },
        cutoff: { label: 'Quiebre / Corte Emocional', color: '#dc2626', stroke: '3', cutoff: true, lines: 1, icon: 'fa-cut', desc: 'Ruptura total de comunicación por conflicto insalvable (Cut-off)' },
        abusive: { label: 'Abuso / Violencia', color: '#991b1b', stroke: '3', arrow: true, lines: 1, icon: 'fa-exclamation-triangle', desc: 'Relación con asimetría de poder, maltrato físico, verbal o psicológico' }
    },

    // Tipos de uniones conyugales
    UNION_TYPES: {
        married: { label: 'Matrimonio Formal', strokeDash: 'none', marks: 0 },
        cohabiting: { label: 'Convivencia / Unión Libre', strokeDash: '6,4', marks: 0 },
        separated: { label: 'Separación', strokeDash: 'none', marks: 1 },
        divorced: { label: 'Divorcio Legal', strokeDash: 'none', marks: 2 }
    },

    // Marcadores clínicos transgeneracionales
    CLINICAL_MARKERS: {
        depression: { label: 'Depresión / Trastorno del Ánimo', icon: 'fa-cloud-rain', color: '#3b82f6', pattern: 'top-half' },
        anxiety: { label: 'Ansiedad / Pánico', icon: 'fa-wind', color: '#f59e0b', pattern: 'quarter-tl' },
        alcoholism: { label: 'Alcoholismo / Abuso de Sustancias', icon: 'fa-wine-bottle', color: '#8b5cf6', pattern: 'bottom-half' },
        bipolar: { label: 'Trastorno Bipolar', icon: 'fa-adjust', color: '#ec4899', pattern: 'diagonal-split' },
        suicide: { label: 'Suicidio / Intento Autolítico', icon: 'fa-skull', color: '#1e293b', pattern: 'center-x' },
        schizophrenia: { label: 'Psicosis / Esquizofrenia', icon: 'fa-brain', color: '#06b6d4', pattern: 'left-half' },
        chronic_illness: { label: 'Enfermedad Médica Crónica', icon: 'fa-heartbeat', color: '#ef4444', pattern: 'dot' },
        violence: { label: 'Violencia Familiar', icon: 'fa-fist-raised', color: '#b91c1c', pattern: 'border-red' }
    },

    // Estado en memoria para el lienzo interactivo actual
    currentGenogram: null,
    dragState: null,
    selectedMemberId: null,

    // =============================================================
    // 1. INICIALIZACIÓN Y GENERACIÓN ASISTIDA DESDE PACIENTE
    // =============================================================
    createDefaultGenogram(patient) {
        if (!patient) return null;
        const now = new Date();
        const currentYear = now.getFullYear();
        const pAge = patient.age || (patient.birthdate ? this.calcAge(patient.birthdate) : 30);
        const pGender = (patient.gender === 'F' || patient.gender === 'femenino' || patient.category === 'child' && (patient.name || '').toLowerCase().endsWith('a')) ? 'F' : 'M';
        const pName = patient.name || 'Paciente';

        // Centro del lienzo (1000 x 600)
        const centerX = 500;
        const gen0Y = 160; // Padres / Tíos
        const gen1Y = 320; // Paciente / Pareja / Hermanos
        const gen2Y = 480; // Hijos

        const members = [
            {
                id: 'p_index',
                name: pName,
                gender: pGender,
                age: pAge,
                birthYear: currentYear - pAge,
                isDeceased: false,
                deathYear: null,
                causeOfDeath: '',
                isIndex: true,
                generation: 1,
                x: centerX,
                y: gen1Y,
                inHousehold: true,
                clinicalConditions: patient.diagnosis ? ['anxiety'] : [],
                occupation: patient.occupation || '',
                notes: 'Paciente identificado (Caso Índice)'
            }
        ];

        const unions = [];
        const children = [];
        const relationships = [];

        // Evaluar datos de padres / tutores si existen en el expediente
        const fatherName = patient.fatherName || (patient.guardian_relation === 'Padre' ? patient.guardian_name : 'Padre');
        const motherName = patient.motherName || (patient.guardian_relation === 'Madre' ? patient.guardian_name : 'Madre');
        const hasParentInfo = Boolean(patient.fatherName || patient.motherName || patient.guardian_name);

        if (hasParentInfo || patient.life_stage === 'child' || patient.life_stage === 'adolescent') {
            const fatherAge = pAge + 28;
            const motherAge = pAge + 26;

            members.push({
                id: 'm_father',
                name: fatherName,
                gender: 'M',
                age: fatherAge,
                birthYear: currentYear - fatherAge,
                isDeceased: false,
                deathYear: null,
                isIndex: false,
                generation: 0,
                x: centerX - 90,
                y: gen0Y,
                inHousehold: patient.livesWith ? patient.livesWith.toLowerCase().includes('padre') : true,
                clinicalConditions: [],
                occupation: patient.fatherOccupation || '',
                notes: ''
            });

            members.push({
                id: 'm_mother',
                name: motherName,
                gender: 'F',
                age: motherAge,
                birthYear: currentYear - motherAge,
                isDeceased: false,
                deathYear: null,
                isIndex: false,
                generation: 0,
                x: centerX + 90,
                y: gen0Y,
                inHousehold: patient.livesWith ? patient.livesWith.toLowerCase().includes('madre') : true,
                clinicalConditions: [],
                occupation: patient.motherOccupation || '',
                notes: ''
            });

            const unionId = 'u_parents';
            unions.push({
                id: unionId,
                partner1Id: 'm_father',
                partner2Id: 'm_mother',
                type: (patient.parentsMaritalStatus && patient.parentsMaritalStatus.includes('Divor')) ? 'divorced' : 'married',
                year: `${currentYear - pAge - 2}`,
                separationYear: ''
            });

            children.push({
                id: 'c_index',
                unionId: unionId,
                childId: 'p_index',
                type: 'biological'
            });

            // Relación afectiva base saludable
            relationships.push({
                id: 'r_p_mother',
                fromId: 'p_index',
                toId: 'm_mother',
                type: 'harmonious',
                notes: 'Vínculo afectivo cercano'
            });
        }

        return {
            patientId: patient.id,
            version: '2.0-bowen',
            updatedAt: new Date().toISOString(),
            members,
            unions,
            children,
            relationships,
            notes: patient.familyDynamics || 'Estructura familiar base generada para exploración sistémica.'
        };
    },

    calcAge(birthdate) {
        if (!birthdate) return 30;
        const b = new Date(birthdate);
        const diff = Date.now() - b.getTime();
        return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
    },

    getGenogramForPatient(patient) {
        if (!patient) return null;
        if (patient.genogram && Array.isArray(patient.genogram.members) && patient.genogram.members.length > 0) {
            return patient.genogram;
        }
        // Buscar en preconsulta_data si se guardó allí
        if (patient.preconsulta_data && patient.preconsulta_data.genogram && Array.isArray(patient.preconsulta_data.genogram.members)) {
            return patient.preconsulta_data.genogram;
        }
        // Crear nuevo por defecto
        const defaultG = this.createDefaultGenogram(patient);
        patient.genogram = defaultG;
        return defaultG;
    },

    // =============================================================
    // 2. RENDERIZADOR VECTORIAL SVG (MCGOLDRICK & GERSON STANDARD)
    // =============================================================
    renderSVG(genogram, options = {}) {
        if (!genogram || !Array.isArray(genogram.members)) {
            return '<div class="empty-state"><p>No hay datos de genograma disponibles.</p></div>';
        }

        const width = options.width || 960;
        const height = options.height || 540;
        const interactive = options.interactive !== false;

        // 1. Calcular perímetro del hogar (Household boundary)
        const householdSvg = this.renderHouseholdBoundary(genogram.members.filter(m => m.inHousehold));

        // 2. Renderizar uniones conyugales
        const unionsSvg = genogram.unions.map(u => this.renderUnionLine(u, genogram.members)).join('');

        // 3. Renderizar líneas de descendencia filial
        const childrenSvg = genogram.children.map(c => this.renderChildLine(c, genogram.unions, genogram.members)).join('');

        // 4. Renderizar líneas afectivas y dinámicas de Bowen
        const relationshipsSvg = (genogram.relationships || []).map(r => this.renderRelationshipPath(r, genogram.members)).join('');

        // 5. Renderizar miembros (figuras)
        const membersSvg = genogram.members.map(m => this.renderMemberNode(m, interactive)).join('');

        return `
        <svg id="genogramSvgCanvas" class="genogram-canvas ${interactive ? 'interactive' : 'static'}"
             viewBox="0 0 ${width} ${height}"
             width="100%" height="${height}"
             xmlns="http://www.w3.org/2000/svg"
             style="background: var(--bg-card, #ffffff); border-radius: 12px; user-select: none;">
            
            <defs>
                <!-- Patrón sombreado para adicciones/alcoholismo (mitad inferior) -->
                <clipPath id="clipBottomHalf">
                    <rect x="-26" y="0" width="52" height="26" />
                </clipPath>
                <!-- Patrón sombreado para depresión (mitad superior) -->
                <clipPath id="clipTopHalf">
                    <rect x="-26" y="-26" width="52" height="26" />
                </clipPath>
                <!-- Patrón cuadrante superior izquierdo (ansiedad) -->
                <clipPath id="clipQuarterTL">
                    <rect x="-26" y="-26" width="26" height="26" />
                </clipPath>
                <!-- Patrón mitad izquierda (psicosis) -->
                <clipPath id="clipLeftHalf">
                    <rect x="-26" y="-26" width="26" height="52" />
                </clipPath>
                <!-- Filtro de sombra suave para tarjetas de miembro -->
                <filter id="genoShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12" />
                </filter>
            </defs>

            <!-- Capa 1: Límite del Hogar (Household) -->
            <g id="layerHousehold">${householdSvg}</g>

            <!-- Capa 2: Uniones Conyugales -->
            <g id="layerUnions">${unionsSvg}</g>

            <!-- Capa 3: Líneas de Descendencia Filial -->
            <g id="layerChildren">${childrenSvg}</g>

            <!-- Capa 4: Vínculos Afectivos de Bowen -->
            <g id="layerRelationships">${relationshipsSvg}</g>

            <!-- Capa 5: Nodos y Figuras de Miembros -->
            <g id="layerMembers">${membersSvg}</g>
        </svg>`;
    },

    // Renderizado del Límite de Coresidencia (Hogar)
    renderHouseholdBoundary(householdMembers) {
        if (!householdMembers || householdMembers.length === 0) return '';
        if (householdMembers.length === 1) {
            const m = householdMembers[0];
            return `<rect x="${m.x - 55}" y="${m.y - 55}" width="110" height="130" rx="20"
                          fill="rgba(66, 158, 189, 0.05)" stroke="#0d9488" stroke-width="1.8" stroke-dasharray="6,5" />
                    <text x="${m.x - 45}" y="${m.y - 60}" font-size="10.5" font-weight="600" fill="#0d9488">🏠 Hogar actual</text>`;
        }

        // Envolvente bounding box expandida
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        householdMembers.forEach(m => {
            if (m.x < minX) minX = m.x;
            if (m.x > maxX) maxX = m.x;
            if (m.y < minY) minY = m.y;
            if (m.y > maxY) maxY = m.y;
        });

        const padX = 65;
        const padYTop = 50;
        const padYBottom = 65;
        const w = (maxX - minX) + (padX * 2);
        const h = (maxY - minY) + padYTop + padYBottom;

        return `
        <rect x="${minX - padX}" y="${minY - padYTop}" width="${w}" height="${h}" rx="28"
              fill="rgba(13, 148, 136, 0.04)" stroke="#0d9488" stroke-width="1.8" stroke-dasharray="7,6" />
        <g transform="translate(${minX - padX + 14}, ${minY - padYTop + 18})">
            <rect x="0" y="-12" width="130" height="18" rx="4" fill="var(--bg-card, #ffffff)" />
            <text x="4" y="0" font-size="11" font-weight="700" fill="#0d9488">🏠 Convivientes (Hogar)</text>
        </g>`;
    },

    // Renderizado de la Línea de Unión Conyugal (Matrimonio, Divorcio, etc.)
    renderUnionLine(union, members) {
        const p1 = members.find(m => m.id === union.partner1Id);
        const p2 = members.find(m => m.id === union.partner2Id);
        if (!p1 || !p2) return '';

        // Conectar desde la base inferior de cada figura
        const yDrop = Math.max(p1.y, p2.y) + 38;
        const typeInfo = this.UNION_TYPES[union.type] || this.UNION_TYPES.married;

        // Camino en U invertida cuadrangular: p1 -> baja a yDrop -> horizontal hasta p2 -> sube a p2
        const pathData = `M ${p1.x} ${p1.y + 26} L ${p1.x} ${yDrop} L ${p2.x} ${yDrop} L ${p2.x} ${p2.y + 26}`;
        const midX = (p1.x + p2.x) / 2;

        let marksSvg = '';
        if (typeInfo.marks === 1) {
            // Separación: 1 barra diagonal inclinada
            marksSvg = `<line x1="${midX - 5}" y1="${yDrop + 9}" x2="${midX + 5}" y2="${yDrop - 9}" stroke="#dc2626" stroke-width="2.5" />`;
        } else if (typeInfo.marks === 2) {
            // Divorcio: 2 barras diagonales paralelas
            marksSvg = `
                <line x1="${midX - 9}" y1="${yDrop + 9}" x2="${midX + 1}" y2="${yDrop - 9}" stroke="#dc2626" stroke-width="2.5" />
                <line x1="${midX - 2}" y1="${yDrop + 9}" x2="${midX + 8}" y2="${yDrop - 9}" stroke="#dc2626" stroke-width="2.5" />`;
        }

        // Año de unión o separación
        let labelSvg = '';
        if (union.year || union.separationYear) {
            const txt = [union.year ? `m.${union.year}` : '', union.separationYear ? `s.${union.separationYear}` : ''].filter(Boolean).join(' ');
            labelSvg = `<text x="${midX}" y="${yDrop + 16}" text-anchor="middle" font-size="10" fill="var(--text-tertiary, #64748b)">${txt}</text>`;
        }

        return `
        <g class="union-link" data-union-id="${union.id}" onclick="GenogramModule.openUnionModal('${union.id}')" style="cursor:pointer;">
            <path d="${pathData}" fill="none" stroke="var(--border-secondary, #475569)" stroke-width="2" stroke-dasharray="${typeInfo.strokeDash}" />
            ${marksSvg}
            ${labelSvg}
        </g>`;
    },

    // Renderizado de la Línea de Descendencia Filial
    renderChildLine(childLink, unions, members) {
        const union = unions.find(u => u.id === childLink.unionId);
        const child = members.find(m => m.id === childLink.childId);
        if (!union || !child) return '';

        const p1 = members.find(m => m.id === union.partner1Id);
        const p2 = members.find(m => m.id === union.partner2Id);
        if (!p1 || !p2) return '';

        const midUnionX = (p1.x + p2.x) / 2;
        const unionY = Math.max(p1.y, p2.y) + 38;
        const childTopY = child.y - 26;
        const splitY = unionY + ((childTopY - unionY) * 0.45);

        // Línea que desciende de la unión, quiebra horizontal hasta la coordenada X del hijo y desciende
        let pathData = `M ${midUnionX} ${unionY} L ${midUnionX} ${splitY} L ${child.x} ${splitY} L ${child.x} ${childTopY}`;
        let strokeDash = 'none';

        if (childLink.type === 'adopted') {
            strokeDash = '4,4';
        }

        return `
        <g class="child-link">
            <path d="${pathData}" fill="none" stroke="var(--border-secondary, #475569)" stroke-width="1.8" stroke-dasharray="${strokeDash}" />
            ${childLink.type === 'adopted' ? `<text x="${child.x}" y="${childTopY - 6}" font-size="9.5" text-anchor="middle" fill="#0d9488">[Adopción]</text>` : ''}
        </g>`;
    },

    // Renderizado de las Pautas Relacionales de Bowen (Afectivas)
    renderRelationshipPath(rel, members) {
        const from = members.find(m => m.id === rel.fromId);
        const to = members.find(m => m.id === rel.toId);
        if (!from || !to) return '';

        const relInfo = this.RELATIONSHIP_TYPES[rel.type] || this.RELATIONSHIP_TYPES.harmonious;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;

        // Curvatura Bézier suave para no colisionar con líneas genealógicas verticales
        const curveOffset = Math.min(60, Math.max(25, dist * 0.18));
        // Vector normal perpendicular
        const nx = -dy / dist;
        const ny = dx / dist;

        const startX = from.x;
        const startY = from.y;
        const endX = to.x;
        const endY = to.y;

        const ctrlX = ((startX + endX) / 2) + (nx * curveOffset);
        const ctrlY = ((startY + endY) / 2) + (ny * curveOffset);

        const pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
        const midX = (startX + 2 * ctrlX + endX) / 4;
        const midY = (startY + 2 * ctrlY + endY) / 4;

        let content = '';

        if (relInfo.lines === 2) {
            // Armónica: 2 líneas paralelas
            content = `
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="4.5" opacity="0.3" />
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="1.8" />`;
        } else if (relInfo.lines === 3 && !relInfo.zigzag) {
            // Fusionada / Enmeshed: 3 líneas paralelas sólidas
            content = `
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="7" opacity="0.2" />
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="4" stroke-dasharray="none" />
                <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="1.5" />`;
        } else if (relInfo.zigzag) {
            // Conflictiva / Fusión conflictiva: Zigzag enérgico
            content = `
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="2.5" stroke-dasharray="5,4" />
                <circle cx="${midX}" cy="${midY}" r="11" fill="var(--bg-card, #ffffff)" stroke="${relInfo.color}" stroke-width="1.8" />
                <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="${relInfo.color}">⚡</text>`;
        } else if (relInfo.cutoff) {
            // Corte emocional (Cut-off): Doble barra perpendicular de interrupción
            content = `
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="2" />
                <line x1="${midX - 7 * nx - 8 * ny}" y1="${midY - 7 * ny + 8 * nx}" x2="${midX - 7 * nx + 8 * ny}" y2="${midY - 7 * ny - 8 * nx}" stroke="${relInfo.color}" stroke-width="3" />
                <line x1="${midX + 7 * nx - 8 * ny}" y1="${midY + 7 * ny + 8 * nx}" x2="${midX + 7 * nx + 8 * ny}" y2="${midY + 7 * ny - 8 * nx}" stroke="${relInfo.color}" stroke-width="3" />`;
        } else if (relInfo.arrow) {
            // Abuso / Violencia
            content = `
                <path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="2.5" stroke-dasharray="4,3" />
                <circle cx="${midX}" cy="${midY}" r="10" fill="#fee2e2" stroke="${relInfo.color}" stroke-width="1.5" />
                <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" font-size="10" fill="${relInfo.color}">⚠️</text>`;
        } else {
            // Distante / Fría: Punteada
            content = `<path d="${pathD}" fill="none" stroke="${relInfo.color}" stroke-width="2" stroke-dasharray="4,5" />`;
        }

        return `
        <g class="relationship-link" data-rel-id="${rel.id}" onclick="GenogramModule.openRelationshipModal('${rel.id}')" style="cursor:pointer;" title="${relInfo.label}">
            ${content}
        </g>`;
    },

    // Renderizado del Nodo Individual de un Miembro (McGoldrick Standard)
    renderMemberNode(m, interactive = true) {
        const size = 52;
        const half = size / 2;
        const isMale = m.gender === 'M';
        const isFemale = m.gender === 'F';
        const isNonBinary = !isMale && !isFemale;

        // Base de color y relleno
        const strokeColor = m.isIndex ? 'var(--brand-deep, #053f5c)' : 'var(--text-primary, #1e293b)';
        const fillColor = 'var(--bg-card, #ffffff)';
        const strokeWidth = m.isIndex ? 3 : 2;

        let shapeSvg = '';

        if (isMale) {
            // Cuadrado
            shapeSvg = `
                <rect x="${-half}" y="${-half}" width="${size}" height="${size}" rx="4"
                      fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
            if (m.isIndex) {
                // Doble borde para paciente identificado
                shapeSvg += `
                <rect x="${-half + 5}" y="${-half + 5}" width="${size - 10}" height="${size - 10}" rx="2"
                      fill="none" stroke="${strokeColor}" stroke-width="1.6" />`;
            }
        } else if (isFemale) {
            // Círculo
            shapeSvg = `
                <circle cx="0" cy="0" r="${half}"
                        fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
            if (m.isIndex) {
                // Doble borde concéntrico para paciente identificada
                shapeSvg += `
                <circle cx="0" cy="0" r="${half - 5}"
                        fill="none" stroke="${strokeColor}" stroke-width="1.6" />`;
            }
        } else {
            // Rombo (No binario / Otro)
            shapeSvg = `
                <polygon points="0,${-half - 2} ${half + 2},0 0,${half + 2} ${-half - 2},0"
                         fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
            if (m.isIndex) {
                shapeSvg += `
                <polygon points="0,${-half + 4} ${half - 4},0 0,${half - 4} ${-half + 4},0"
                         fill="none" stroke="${strokeColor}" stroke-width="1.5" />`;
            }
        }

        // Marcadores clínicos y sombreados dentro de la figura
        let markersSvg = '';
        const conditions = m.clinicalConditions || [];

        if (conditions.includes('alcoholism')) {
            // Mitad inferior sombreada
            if (isMale) {
                markersSvg += `<rect x="${-half}" y="0" width="${size}" height="${half}" fill="#8b5cf6" opacity="0.65" rx="1" />`;
            } else if (isFemale) {
                markersSvg += `<path d="M ${-half} 0 A ${half} ${half} 0 0 0 ${half} 0 Z" fill="#8b5cf6" opacity="0.65" />`;
            }
        }

        if (conditions.includes('depression')) {
            // Mitad superior sombreada
            if (isMale) {
                markersSvg += `<rect x="${-half}" y="${-half}" width="${size}" height="${half}" fill="#3b82f6" opacity="0.55" rx="1" />`;
            } else if (isFemale) {
                markersSvg += `<path d="M ${-half} 0 A ${half} ${half} 0 0 1 ${half} 0 Z" fill="#3b82f6" opacity="0.55" />`;
            }
        }

        if (conditions.includes('anxiety')) {
            markersSvg += `<circle cx="${half - 6}" cy="${-half + 6}" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="1" />`;
        }

        if (conditions.includes('suicide')) {
            markersSvg += `<text x="0" y="4" text-anchor="middle" font-size="16" fill="#1e293b" font-weight="900">✞</text>`;
        }

        // Estado vital: Fallecido (Cruz diagonal tachando el símbolo)
        let deceasedSvg = '';
        if (m.isDeceased) {
            deceasedSvg = `
                <line x1="${-half - 4}" y1="${-half - 4}" x2="${half + 4}" y2="${half + 4}" stroke="#dc2626" stroke-width="2.4" />
                <line x1="${-half - 4}" y1="${half + 4}" x2="${half + 4}" y2="${-half - 4}" stroke="#dc2626" stroke-width="2.4" />`;
        }

        // Edad o texto dentro del símbolo
        const centerText = m.isDeceased ? (m.deathYear ? `m.${m.deathYear}` : '†') : (m.age ? `${m.age}` : '');
        const textSvg = centerText ? `
            <text x="0" y="4.5" text-anchor="middle" font-size="13" font-weight="700"
                  fill="var(--text-primary, #0f172a)">${centerText}</text>` : '';

        // Etiquetas inferiores (Nombre, ocupación, notas clínicas)
        const nameLabel = m.name || 'Familiar';
        const truncatedName = nameLabel.length > 18 ? nameLabel.substring(0, 16) + '…' : nameLabel;
        const subLabel = m.isIndex ? '★ Paciente' : (m.occupation || '');

        return `
        <g class="member-node ${m.isIndex ? 'is-index' : ''} ${interactive ? 'draggable' : ''}"
           id="member_${m.id}" data-member-id="${m.id}"
           transform="translate(${m.x}, ${m.y})"
           filter="url(#genoShadow)"
           onmousedown="GenogramModule.onMemberMouseDown(event, '${m.id}')"
           onclick="GenogramModule.onMemberClick(event, '${m.id}')"
           style="cursor:${interactive ? 'grab' : 'pointer'};">
            
            ${shapeSvg}
            ${markersSvg}
            ${textSvg}
            ${deceasedSvg}

            <!-- Etiqueta Nombre -->
            <text x="0" y="${half + 16}" text-anchor="middle" font-size="11.5" font-weight="600"
                  fill="var(--text-primary, #0f172a)">${truncatedName}</text>
            
            <!-- Etiqueta Subtítulo / Ocupación -->
            ${subLabel ? `<text x="0" y="${half + 29}" text-anchor="middle" font-size="10"
                                fill="${m.isIndex ? 'var(--brand-deep, #0d9488)' : 'var(--text-tertiary, #64748b)'}"
                                font-weight="${m.isIndex ? '700' : '400'}">${subLabel}</text>` : ''}
        </g>`;
    },

    // =============================================================
    // 3. INTERACCIÓN Y MANIPULACIÓN DEL LIENZO (DRAG & DROP)
    // =============================================================
    setupInteractiveEvents() {
        const svg = document.getElementById('genogramSvgCanvas');
        if (!svg) return;

        svg.addEventListener('mousemove', (e) => this.onSvgMouseMove(e));
        svg.addEventListener('mouseup', () => this.onSvgMouseUp());
        svg.addEventListener('mouseleave', () => this.onSvgMouseUp());

        // Soporte táctil en tablets y móviles
        svg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.dragState) {
                e.preventDefault();
                this.onSvgTouchMove(e.touches[0]);
            }
        }, { passive: false });
        svg.addEventListener('touchend', () => this.onSvgMouseUp());
    },

    onMemberMouseDown(e, memberId) {
        if (e.button !== 0) return; // Solo clic izquierdo
        e.stopPropagation();
        const svg = document.getElementById('genogramSvgCanvas');
        if (!svg || !this.currentGenogram) return;

        const pt = this.getSvgCoords(e, svg);
        const member = this.currentGenogram.members.find(m => m.id === memberId);
        if (!member) return;

        this.dragState = {
            memberId,
            startX: pt.x,
            startY: pt.y,
            originalX: member.x,
            originalY: member.y,
            hasMoved: false
        };

        const node = document.getElementById(`member_${memberId}`);
        if (node) node.style.cursor = 'grabbing';
    },

    onSvgMouseMove(e) {
        if (!this.dragState || !this.currentGenogram) return;
        const svg = document.getElementById('genogramSvgCanvas');
        if (!svg) return;

        const pt = this.getSvgCoords(e, svg);
        const dx = pt.x - this.dragState.startX;
        const dy = pt.y - this.dragState.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.dragState.hasMoved = true;
        }

        const member = this.currentGenogram.members.find(m => m.id === this.dragState.memberId);
        if (member) {
            // Contener dentro de las dimensiones del lienzo (1000 x 600)
            member.x = Math.max(50, Math.min(910, this.dragState.originalX + dx));
            member.y = Math.max(50, Math.min(550, this.dragState.originalY + dy));
            this.refreshCanvasFast();
        }
    },

    onSvgTouchMove(touch) {
        const svg = document.getElementById('genogramSvgCanvas');
        if (!svg || !this.dragState || !this.currentGenogram) return;

        const pt = this.getSvgCoords(touch, svg);
        const dx = pt.x - this.dragState.startX;
        const dy = pt.y - this.dragState.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.dragState.hasMoved = true;
        }

        const member = this.currentGenogram.members.find(m => m.id === this.dragState.memberId);
        if (member) {
            member.x = Math.max(50, Math.min(910, this.dragState.originalX + dx));
            member.y = Math.max(50, Math.min(550, this.dragState.originalY + dy));
            this.refreshCanvasFast();
        }
    },

    onSvgMouseUp() {
        if (!this.dragState) return;
        const memberId = this.dragState.memberId;
        const hasMoved = this.dragState.hasMoved;
        this.dragState = null;

        const node = document.getElementById(`member_${memberId}`);
        if (node) node.style.cursor = 'grab';

        if (hasMoved) {
            this.saveCurrentGenogram(false);
        }
    },

    onMemberClick(e, memberId) {
        e.stopPropagation();
        if (this.dragState && this.dragState.hasMoved) return;
        this.openMemberModal(memberId);
    },

    getSvgCoords(e, svg) {
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    // Actualización rápida de capas sin recrear todo el DOM
    refreshCanvasFast() {
        if (typeof document === 'undefined') return;
        const container = document.getElementById('genogramCanvasContainer') || document.getElementById('modalGenogramCanvasContainer');
        if (!container || !this.currentGenogram) return;
        const w = container.id === 'modalGenogramCanvasContainer' ? 900 : 960;
        const h = container.id === 'modalGenogramCanvasContainer' ? 460 : 540;
        container.innerHTML = this.renderSVG(this.currentGenogram, { width: w, height: h, interactive: true });
        this.setupInteractiveEvents();
    },

    // =============================================================
    // 4. AUTO-ORGANIZACIÓN ERGONÓMICA POR GENERACIONES
    // =============================================================
    autoArrange() {
        if (!this.currentGenogram || !this.currentGenogram.members.length) return;
        const members = this.currentGenogram.members;

        // Agrupar miembros por generación (-1: Abuelos, 0: Padres, 1: Paciente/Hermanos/Pareja, 2: Hijos)
        const genGroups = {};
        members.forEach(m => {
            const gen = m.generation !== undefined ? m.generation : 1;
            if (!genGroups[gen]) genGroups[gen] = [];
            genGroups[gen].push(m);
        });

        const canvasWidth = 960;
        const genYMap = {
            '-1': 80,   // I. Abuelos
            '0': 200,   // II. Padres y Tíos
            '1': 350,   // III. Paciente, Pareja y Hermanos
            '2': 480    // IV. Hijos
        };

        Object.keys(genGroups).forEach(genStr => {
            const list = genGroups[genStr];
            const y = genYMap[genStr] || (300 + (parseInt(genStr, 10) * 120));
            const count = list.length;
            const spacing = Math.min(180, (canvasWidth - 160) / Math.max(1, count));
            const startX = (canvasWidth / 2) - ((count - 1) * spacing / 2);

            list.forEach((m, idx) => {
                m.x = Math.round(startX + (idx * spacing));
                m.y = y;
            });
        });

        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') {
            showToast('Genograma organizado por generaciones (I, II, III, IV)', 'info');
        }
    },

    // =============================================================
    // 5. PESTAÑA PRINCIPAL DEL EXPEDIENTE DEL PACIENTE
    // =============================================================
    renderTabGenograma(patient) {
        const genogram = this.getGenogramForPatient(patient);
        this.currentGenogram = genogram;

        return `
        <div class="genogram-view-container">
            <!-- Barra Superior de Herramientas y Acciones -->
            <div class="genogram-toolbar">
                <div class="toolbar-group">
                    <button class="btn-sm btn-primary" style="background: linear-gradient(135deg, #0d9488 0%, #053f5c 100%); font-weight:700;" onclick="GenogramModule.openWizardModal('${patient.id}')" title="Asistente interactivo guiado por preguntas con botones y opción múltiple">
                        <i class="fas fa-magic"></i> Asistente de 2da Línea Familiar
                    </button>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.openAddMemberModal()" title="Agregar un nuevo miembro de la familia">
                        <i class="fas fa-user-plus"></i> + Familiar
                    </button>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.openAddUnionModal()" title="Vincular matrimonio, convivencia, separación o divorcio">
                        <i class="fas fa-ring"></i> + Unión
                    </button>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.openAddRelationshipModal()" title="Definir vínculo afectivo o relacional de Bowen">
                        <i class="fas fa-project-diagram"></i> + Dinámica Bowen
                    </button>
                </div>

                <div class="toolbar-group">
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.autoArrange()" title="Alinear y ordenar automáticamente por generaciones">
                        <i class="fas fa-align-center"></i> Auto-organizar
                    </button>
                    <button class="btn-sm btn-ai-serena" onclick="GenogramModule.analyzeWithSerena('${patient.id}')" title="Análisis sistémico transgeneracional con SERENA">
                        <i class="fas fa-brain"></i> Analizar con SERENA
                    </button>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.exportAsPng()" title="Descargar como imagen para informes periciales">
                        <i class="fas fa-download"></i> Exportar PNG
                    </button>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.toggleLegend()" title="Ver la guía de simbología oficial">
                        <i class="fas fa-info-circle"></i> Leyenda
                    </button>
                </div>
            </div>

            <!-- Leyenda Plegable de Simbología McGoldrick & Bowen -->
            <div id="genogramLegendPanel" class="genogram-legend-panel" style="display:none;">
                <div class="legend-header">
                    <h4><i class="fas fa-book-open"></i> Simbología Oficial del Genograma (McGoldrick & Bowen)</h4>
                    <button class="btn-icon" onclick="GenogramModule.toggleLegend()"><i class="fas fa-times"></i></button>
                </div>
                <div class="legend-grid">
                    <div class="legend-col">
                        <div class="legend-title">Figuras Anatómicas</div>
                        <div class="legend-item"><span class="legend-sym sym-square"></span> Varón</div>
                        <div class="legend-item"><span class="legend-sym sym-circle"></span> Mujer</div>
                        <div class="legend-item"><span class="legend-sym sym-diamond"></span> No Binario / Otro</div>
                        <div class="legend-item"><span class="legend-sym sym-index"></span> Paciente Identificado (Doble borde)</div>
                        <div class="legend-item"><span class="legend-sym sym-deceased">✞</span> Fallecido (Cruz diagonal)</div>
                        <div class="legend-item"><span class="legend-sym sym-household">---</span> Límite del Hogar (Convivientes)</div>
                    </div>
                    <div class="legend-col">
                        <div class="legend-title">Uniones Conyugales</div>
                        <div class="legend-item"><span class="legend-line line-married"></span> Matrimonio (Línea continua)</div>
                        <div class="legend-item"><span class="legend-line line-cohab"></span> Unión libre / Convivencia (Línea de trazos)</div>
                        <div class="legend-item"><span class="legend-line line-sep">/</span> Separación (Una barra)</div>
                        <div class="legend-item"><span class="legend-line line-div">//</span> Divorcio (Dos barras)</div>
                    </div>
                    <div class="legend-col">
                        <div class="legend-title">Pautas Afectivas (Bowen)</div>
                        <div class="legend-item"><span class="legend-line line-harmonious"></span> Armónica / Muy unida (Doble línea)</div>
                        <div class="legend-item"><span class="legend-line line-enmeshed"></span> Fusionada (Tres líneas sólidas)</div>
                        <div class="legend-item"><span class="legend-line line-conflict">⚡</span> Conflictiva / Fusión conflictiva</div>
                        <div class="legend-item"><span class="legend-line line-distant">••••</span> Distante / Fría (Punteada)</div>
                        <div class="legend-item"><span class="legend-line line-cutoff">||</span> Corte Emocional (Cut-off)</div>
                    </div>
                </div>
            </div>

            <!-- Contenedor del Lienzo SVG Interactivo -->
            <div id="genogramCanvasContainer" class="genogram-canvas-wrapper">
                ${this.renderSVG(genogram, { width: 960, height: 540, interactive: true })}
            </div>

            <!-- Panel de Notas Sistémicas y Formulación Familiar -->
            <div class="genogram-notes-section">
                <div class="notes-header">
                    <h4><i class="fas fa-clipboard-list"></i> Formulación e Hipótesis Sistémica Transgeneracional</h4>
                    <button class="btn-sm btn-secondary" onclick="GenogramModule.saveNotes('${patient.id}')">
                        <i class="fas fa-save"></i> Guardar Formulación
                    </button>
                </div>
                <textarea id="genogramSystemicNotes" rows="3" class="form-control"
                          placeholder="Registra aquí observaciones clínicas: triangulaciones observadas, lealtades invisibles, duelos no resueltos o mandatos familiares...">${genogram.notes || ''}</textarea>
            </div>

            <!-- Panel de Resultados del Copiloto SERENA (IA) -->
            <div id="serenaSystemicAnalysisCard" class="serena-analysis-card" style="display:none;"></div>
        </div>`;
    },

    initPatientGenogram(patientId) {
        const patient = (typeof AppState !== 'undefined' && AppState.patients) 
            ? AppState.patients.find(p => String(p.id) === String(patientId))
            : null;
        if (!patient) return;
        this.currentGenogram = this.getGenogramForPatient(patient);
        setTimeout(() => this.setupInteractiveEvents(), 100);
    },

    toggleLegend() {
        const panel = document.getElementById('genogramLegendPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    // =============================================================
    // 6. GESTIÓN Y MODALES: MIEMBROS, UNIONES Y RELACIONES
    // =============================================================
    openAddMemberModal() {
        if (!this.currentGenogram) return;
        const modalHtml = `
        <div class="modal active" id="modalGenoMember">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalGenoMember')"></div>
            <div class="modal-content modal-large" style="max-width: 640px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-user-plus"></i> Agregar Familiar al Genograma</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalGenoMember')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" id="gMemName" class="form-control" placeholder="Ej. Carlos Pérez" required>
                        </div>
                        <div class="form-group">
                            <label>Parentesco / Rol</label>
                            <select id="gMemRole" class="form-control" onchange="GenogramModule.onRoleChange(this.value)">
                                <option value="parent">Padre / Madre (Gen II)</option>
                                <option value="sibling">Hermano/a (Gen III)</option>
                                <option value="partner">Pareja / Cónyuge (Gen III)</option>
                                <option value="child">Hijo/a (Gen IV)</option>
                                <option value="grandparent">Abuelo/a (Gen I)</option>
                                <option value="other">Otro Familiar</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Género *</label>
                            <select id="gMemGender" class="form-control">
                                <option value="M">Masculino (Cuadrado)</option>
                                <option value="F">Femenino (Círculo)</option>
                                <option value="NB">No Binario / Otro (Rombo)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Edad</label>
                            <input type="number" id="gMemAge" class="form-control" placeholder="Ej. 45" min="0" max="120">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ocupación / Profesión</label>
                            <input type="text" id="gMemOccupation" class="form-control" placeholder="Ej. Docente">
                        </div>
                        <div class="form-group" style="display:flex;align-items:center;padding-top:24px;gap:16px;">
                            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="gMemHousehold" checked> Conviviente en el hogar
                            </label>
                            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="gMemDeceased" onchange="document.getElementById('gMemDeathYearGroup').style.display = this.checked ? 'block' : 'none'"> Fallecido
                            </label>
                        </div>
                    </div>
                    <div class="form-group" id="gMemDeathYearGroup" style="display:none;">
                        <label>Año de Fallecimiento</label>
                        <input type="number" id="gMemDeathYear" class="form-control" placeholder="Ej. 2018">
                    </div>
                    <div class="form-group">
                        <label>Condiciones Clínicas / Marcadores de Salud Mental</label>
                        <div class="markers-checkbox-grid">
                            ${Object.keys(this.CLINICAL_MARKERS).map(key => `
                                <label class="marker-pill">
                                    <input type="checkbox" value="${key}" name="gMemMarkers">
                                    <i class="fas ${this.CLINICAL_MARKERS[key].icon}" style="color:${this.CLINICAL_MARKERS[key].color}"></i>
                                    <span>${this.CLINICAL_MARKERS[key].label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-secondary" onclick="GenogramModule.closeModal('modalGenoMember')">Cancelar</button>
                    <button class="btn-primary" onclick="GenogramModule.saveNewMember()">Guardar Miembro</button>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    saveNewMember() {
        const name = document.getElementById('gMemName')?.value.trim();
        if (!name) {
            alert('Por favor indica el nombre del familiar.');
            return;
        }

        const gender = document.getElementById('gMemGender')?.value || 'M';
        const age = parseInt(document.getElementById('gMemAge')?.value, 10) || null;
        const occupation = document.getElementById('gMemOccupation')?.value.trim() || '';
        const inHousehold = Boolean(document.getElementById('gMemHousehold')?.checked);
        const isDeceased = Boolean(document.getElementById('gMemDeceased')?.checked);
        const deathYear = isDeceased ? parseInt(document.getElementById('gMemDeathYear')?.value, 10) || null : null;
        const role = document.getElementById('gMemRole')?.value || 'other';

        const markers = Array.from(document.querySelectorAll('input[name="gMemMarkers"]:checked')).map(el => el.value);

        // Asignar generación según el rol
        let generation = 1;
        let yPos = 350;
        if (role === 'grandparent') { generation = -1; yPos = 80; }
        else if (role === 'parent') { generation = 0; yPos = 200; }
        else if (role === 'child') { generation = 2; yPos = 480; }

        const existingCount = this.currentGenogram.members.filter(m => m.generation === generation).length;
        const xPos = 200 + (existingCount * 130);

        const newMember = {
            id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name,
            gender,
            age,
            birthYear: age ? new Date().getFullYear() - age : null,
            isDeceased,
            deathYear,
            isIndex: false,
            generation,
            x: xPos,
            y: yPos,
            inHousehold,
            clinicalConditions: markers,
            occupation,
            notes: ''
        };

        this.currentGenogram.members.push(newMember);
        this.closeModal('modalGenoMember');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast(`Familiar ${name} añadido al genograma`, 'success');
    },

    openMemberModal(memberId) {
        if (!this.currentGenogram) return;
        const member = this.currentGenogram.members.find(m => m.id === memberId);
        if (!member) return;

        const modalHtml = `
        <div class="modal active" id="modalEditMember">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalEditMember')"></div>
            <div class="modal-content modal-large" style="max-width: 640px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-user-edit"></i> Editar: ${member.name} ${member.isIndex ? '(Caso Índice)' : ''}</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalEditMember')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" id="gEditName" class="form-control" value="${member.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Género</label>
                            <select id="gEditGender" class="form-control">
                                <option value="M" ${member.gender === 'M' ? 'selected' : ''}>Masculino</option>
                                <option value="F" ${member.gender === 'F' ? 'selected' : ''}>Femenino</option>
                                <option value="NB" ${member.gender === 'NB' ? 'selected' : ''}>No Binario / Otro</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Edad</label>
                            <input type="number" id="gEditAge" class="form-control" value="${member.age || ''}">
                        </div>
                        <div class="form-group">
                            <label>Ocupación</label>
                            <input type="text" id="gEditOccupation" class="form-control" value="${member.occupation || ''}">
                        </div>
                    </div>
                    <div class="form-row" style="align-items:center;padding:10px 0;">
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" id="gEditHousehold" ${member.inHousehold ? 'checked' : ''}> Conviviente en el hogar
                        </label>
                        ${!member.isIndex ? `
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" id="gEditDeceased" ${member.isDeceased ? 'checked' : ''}
                                   onchange="document.getElementById('gEditDeathGroup').style.display = this.checked ? 'block' : 'none'"> Fallecido
                        </label>` : ''}
                    </div>
                    <div class="form-group" id="gEditDeathGroup" style="${member.isDeceased ? '' : 'display:none;'}">
                        <label>Año de Defunción</label>
                        <input type="number" id="gEditDeathYear" class="form-control" value="${member.deathYear || ''}">
                    </div>
                    <div class="form-group">
                        <label>Condiciones Clínicas y Antecedentes</label>
                        <div class="markers-checkbox-grid">
                            ${Object.keys(this.CLINICAL_MARKERS).map(key => `
                                <label class="marker-pill">
                                    <input type="checkbox" value="${key}" name="gEditMarkers" ${(member.clinicalConditions || []).includes(key) ? 'checked' : ''}>
                                    <i class="fas ${this.CLINICAL_MARKERS[key].icon}" style="color:${this.CLINICAL_MARKERS[key].color}"></i>
                                    <span>${this.CLINICAL_MARKERS[key].label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notas Clínicas / Relacionales</label>
                        <textarea id="gEditNotes" class="form-control" rows="2" placeholder="Observaciones particulares">${member.notes || ''}</textarea>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display:flex;justify-content:space-between;">
                    ${!member.isIndex ? `
                        <button class="btn-danger" onclick="GenogramModule.deleteMember('${member.id}')">
                            <i class="fas fa-trash"></i> Eliminar Miembro
                        </button>` : '<div></div>'}
                    <div style="display:flex;gap:8px;">
                        <button class="btn-secondary" onclick="GenogramModule.closeModal('modalEditMember')">Cancelar</button>
                        <button class="btn-primary" onclick="GenogramModule.updateMember('${member.id}')">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    updateMember(memberId) {
        const member = this.currentGenogram.members.find(m => m.id === memberId);
        if (!member) return;

        member.name = document.getElementById('gEditName')?.value.trim() || member.name;
        member.gender = document.getElementById('gEditGender')?.value || member.gender;
        member.age = parseInt(document.getElementById('gEditAge')?.value, 10) || null;
        member.occupation = document.getElementById('gEditOccupation')?.value.trim() || '';
        member.inHousehold = Boolean(document.getElementById('gEditHousehold')?.checked);
        member.notes = document.getElementById('gEditNotes')?.value.trim() || '';

        if (!member.isIndex) {
            member.isDeceased = Boolean(document.getElementById('gEditDeceased')?.checked);
            member.deathYear = member.isDeceased ? parseInt(document.getElementById('gEditDeathYear')?.value, 10) || null : null;
        }

        member.clinicalConditions = Array.from(document.querySelectorAll('input[name="gEditMarkers"]:checked')).map(el => el.value);

        this.closeModal('modalEditMember');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Datos del familiar actualizados', 'success');
    },

    deleteMember(memberId) {
        if (!confirm('¿Eliminar a este familiar del genograma? Se eliminarán también sus uniones y vínculos asociados.')) return;
        this.currentGenogram.members = this.currentGenogram.members.filter(m => m.id !== memberId);
        // Limpiar uniones y relaciones asociadas
        this.currentGenogram.unions = this.currentGenogram.unions.filter(u => u.partner1Id !== memberId && u.partner2Id !== memberId);
        this.currentGenogram.children = this.currentGenogram.children.filter(c => c.childId !== memberId);
        this.currentGenogram.relationships = this.currentGenogram.relationships.filter(r => r.fromId !== memberId && r.toId !== memberId);

        this.closeModal('modalEditMember');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Familiar eliminado', 'info');
    },

    // Modal para registrar una unión conyugal
    openAddUnionModal() {
        if (!this.currentGenogram || this.currentGenogram.members.length < 2) {
            alert('Debes tener al menos 2 personas en el genograma para crear una unión.');
            return;
        }

        const members = this.currentGenogram.members;
        const modalHtml = `
        <div class="modal active" id="modalAddUnion">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalAddUnion')"></div>
            <div class="modal-content modal-large" style="max-width: 540px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-ring"></i> Conectar Unión de Pareja</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalAddUnion')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-group">
                        <label>Pareja 1 *</label>
                        <select id="uPartner1" class="form-control">
                            ${members.map(m => `<option value="${m.id}">${m.name} (${m.gender === 'M' ? 'Varón' : 'Mujer'})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pareja 2 *</label>
                        <select id="uPartner2" class="form-control">
                            ${members.map((m, idx) => `<option value="${m.id}" ${idx === 1 ? 'selected' : ''}>${m.name} (${m.gender === 'M' ? 'Varón' : 'Mujer'})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Vínculo Legal / Conyugal *</label>
                        <select id="uType" class="form-control">
                            <option value="married">Matrimonio Formal (Línea sólida)</option>
                            <option value="cohabiting">Unión Libre / Convivencia (Línea discontinua)</option>
                            <option value="separated">Separación (Línea con una barra /)</option>
                            <option value="divorced">Divorcio Legal (Línea con dos barras //)</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Año de Unión</label>
                            <input type="text" id="uYear" class="form-control" placeholder="Ej. 2010">
                        </div>
                        <div class="form-group">
                            <label>Año de Separación</label>
                            <input type="text" id="uSepYear" class="form-control" placeholder="Ej. 2021">
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-secondary" onclick="GenogramModule.closeModal('modalAddUnion')">Cancelar</button>
                    <button class="btn-primary" onclick="GenogramModule.saveNewUnion()">Establecer Unión</button>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    saveNewUnion() {
        const p1 = document.getElementById('uPartner1')?.value;
        const p2 = document.getElementById('uPartner2')?.value;
        if (!p1 || !p2 || p1 === p2) {
            alert('Debes seleccionar dos personas distintas para la unión.');
            return;
        }

        const type = document.getElementById('uType')?.value || 'married';
        const year = document.getElementById('uYear')?.value.trim() || '';
        const separationYear = document.getElementById('uSepYear')?.value.trim() || '';

        const newUnion = {
            id: `u_${Date.now()}`,
            partner1Id: p1,
            partner2Id: p2,
            type,
            year,
            separationYear
        };

        this.currentGenogram.unions.push(newUnion);
        this.closeModal('modalAddUnion');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Unión conyugal registrada', 'success');
    },

    // Modal para registrar una dinámica afectiva de Bowen
    openAddRelationshipModal() {
        if (!this.currentGenogram || this.currentGenogram.members.length < 2) {
            alert('Debes tener al menos 2 personas en el genograma para trazar una dinámica afectiva.');
            return;
        }

        const members = this.currentGenogram.members;
        const modalHtml = `
        <div class="modal active" id="modalAddRel">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalAddRel')"></div>
            <div class="modal-content modal-large" style="max-width: 580px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-project-diagram"></i> Registrar Pauta Relacional (Bowen)</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalAddRel')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Desde *</label>
                            <select id="rFrom" class="form-control">
                                ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Hacia *</label>
                            <select id="rTo" class="form-control">
                                ${members.map((m, idx) => `<option value="${m.id}" ${idx === 1 ? 'selected' : ''}>${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Vínculo Afectivo / Interpersonal *</label>
                        <select id="rType" class="form-control">
                            ${Object.keys(this.RELATIONSHIP_TYPES).map(key => `
                                <option value="${key}">${this.RELATIONSHIP_TYPES[key].label} — ${this.RELATIONSHIP_TYPES[key].desc}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Observaciones o Hipótesis Sistémica</label>
                        <input type="text" id="rNotes" class="form-control" placeholder="Ej. Triangulación parental, desborde de reactividad...">
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-secondary" onclick="GenogramModule.closeModal('modalAddRel')">Cancelar</button>
                    <button class="btn-primary" onclick="GenogramModule.saveNewRelationship()">Trazar Dinámica</button>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    saveNewRelationship() {
        const from = document.getElementById('rFrom')?.value;
        const to = document.getElementById('rTo')?.value;
        if (!from || !to || from === to) {
            alert('Debes seleccionar dos familiares distintos.');
            return;
        }

        const type = document.getElementById('rType')?.value || 'harmonious';
        const notes = document.getElementById('rNotes')?.value.trim() || '';

        const newRel = {
            id: `r_${Date.now()}`,
            fromId: from,
            toId: to,
            type,
            notes
        };

        if (!Array.isArray(this.currentGenogram.relationships)) {
            this.currentGenogram.relationships = [];
        }
        this.currentGenogram.relationships.push(newRel);
        this.closeModal('modalAddRel');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Dinámica relacional registrada', 'success');
    },

    // Modal de edición o borrado de una relación existente al hacer clic en ella
    openRelationshipModal(relId) {
        const rel = (this.currentGenogram.relationships || []).find(r => r.id === relId);
        if (!rel) return;
        const fromM = this.currentGenogram.members.find(m => m.id === rel.fromId);
        const toM = this.currentGenogram.members.find(m => m.id === rel.toId);

        const modalHtml = `
        <div class="modal active" id="modalEditRel">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalEditRel')"></div>
            <div class="modal-content modal-large" style="max-width: 540px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-link"></i> Dinámica: ${fromM?.name} ↔ ${toM?.name}</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalEditRel')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-group">
                        <label>Tipo de Vínculo</label>
                        <select id="rEditType" class="form-control">
                            ${Object.keys(this.RELATIONSHIP_TYPES).map(key => `
                                <option value="${key}" ${rel.type === key ? 'selected' : ''}>${this.RELATIONSHIP_TYPES[key].label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <input type="text" id="rEditNotes" class="form-control" value="${rel.notes || ''}">
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display:flex;justify-content:space-between;">
                    <button class="btn-danger" onclick="GenogramModule.deleteRelationship('${rel.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-secondary" onclick="GenogramModule.closeModal('modalEditRel')">Cerrar</button>
                        <button class="btn-primary" onclick="GenogramModule.updateRelationship('${rel.id}')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    updateRelationship(relId) {
        const rel = (this.currentGenogram.relationships || []).find(r => r.id === relId);
        if (!rel) return;
        rel.type = document.getElementById('rEditType')?.value || rel.type;
        rel.notes = document.getElementById('rEditNotes')?.value.trim() || '';
        this.closeModal('modalEditRel');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
    },

    deleteRelationship(relId) {
        this.currentGenogram.relationships = (this.currentGenogram.relationships || []).filter(r => r.id !== relId);
        this.closeModal('modalEditRel');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Dinámica relacional eliminada', 'info');
    },

    openUnionModal(unionId) {
        const union = (this.currentGenogram.unions || []).find(u => u.id === unionId);
        if (!union) return;
        const p1 = this.currentGenogram.members.find(m => m.id === union.partner1Id);
        const p2 = this.currentGenogram.members.find(m => m.id === union.partner2Id);

        const modalHtml = `
        <div class="modal active" id="modalEditUnion">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalEditUnion')"></div>
            <div class="modal-content modal-large" style="max-width: 540px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-ring"></i> Unión: ${p1?.name} & ${p2?.name}</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalEditUnion')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding: 16px;">
                    <div class="form-group">
                        <label>Estado de la Unión</label>
                        <select id="uEditType" class="form-control">
                            <option value="married" ${union.type === 'married' ? 'selected' : ''}>Matrimonio Formal</option>
                            <option value="cohabiting" ${union.type === 'cohabiting' ? 'selected' : ''}>Unión Libre / Convivencia</option>
                            <option value="separated" ${union.type === 'separated' ? 'selected' : ''}>Separados</option>
                            <option value="divorced" ${union.type === 'divorced' ? 'selected' : ''}>Divorciados</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Año de Unión</label>
                            <input type="text" id="uEditYear" class="form-control" value="${union.year || ''}">
                        </div>
                        <div class="form-group">
                            <label>Año Separación</label>
                            <input type="text" id="uEditSepYear" class="form-control" value="${union.separationYear || ''}">
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px; border-top: 1px solid var(--border-primary); display:flex;justify-content:space-between;">
                    <button class="btn-danger" onclick="GenogramModule.deleteUnion('${union.id}')">
                        <i class="fas fa-trash"></i> Eliminar Unión
                    </button>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-secondary" onclick="GenogramModule.closeModal('modalEditUnion')">Cerrar</button>
                        <button class="btn-primary" onclick="GenogramModule.updateUnion('${union.id}')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    updateUnion(unionId) {
        const union = (this.currentGenogram.unions || []).find(u => u.id === unionId);
        if (!union) return;
        union.type = document.getElementById('uEditType')?.value || union.type;
        union.year = document.getElementById('uEditYear')?.value.trim() || '';
        union.separationYear = document.getElementById('uEditSepYear')?.value.trim() || '';
        this.closeModal('modalEditUnion');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
    },

    deleteUnion(unionId) {
        this.currentGenogram.unions = (this.currentGenogram.unions || []).filter(u => u.id !== unionId);
        this.currentGenogram.children = (this.currentGenogram.children || []).filter(c => c.unionId !== unionId);
        this.closeModal('modalEditUnion');
        this.refreshCanvasFast();
        this.saveCurrentGenogram(true);
        if (typeof showToast === 'function') showToast('Unión eliminada', 'info');
    },

    // Inyector helper de modales en el DOM
    injectModal(modalHtml) {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.modal[id^="modalGeno"], .modal[id^="modalEdit"], .modal[id^="modalAdd"], .modal-overlay[id^="modal"]').forEach(el => el.remove());
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        const newEl = container.firstElementChild;
        document.body.appendChild(newEl);
    },

    closeModal(modalId) {
        if (typeof document === 'undefined') return;
        const el = document.getElementById(modalId);
        if (el) el.remove();
    },

    // =============================================================
    // 7. PERSISTENCIA Y GUARDADO EN EXPEDIENTE
    // =============================================================
    saveNotes(patientId) {
        const notes = document.getElementById('genogramSystemicNotes')?.value.trim() || '';
        if (this.currentGenogram) {
            this.currentGenogram.notes = notes;
            this.saveCurrentGenogram(true);
            if (typeof showToast === 'function') showToast('Formulación sistémica guardada', 'success');
        }
    },

    saveCurrentGenogram(showFeedback = false) {
        if (!this.currentGenogram) return;
        this.currentGenogram.updatedAt = new Date().toISOString();

        if (typeof AppState !== 'undefined' && Array.isArray(AppState.patients)) {
            const patient = AppState.patients.find(p => String(p.id) === String(this.currentGenogram.patientId));
            if (patient) {
                patient.genogram = this.currentGenogram;
                if (!patient.preconsulta_data) patient.preconsulta_data = {};
                patient.preconsulta_data.genogram = this.currentGenogram;
            }
            if (typeof saveData === 'function') {
                saveData();
            } else if (typeof saveDataLocallyOnly === 'function') {
                saveDataLocallyOnly();
            }
        }

        if (showFeedback && typeof showToast === 'function') {
            showToast('Genograma guardado y sincronizado', 'success');
        }
    },

    // =============================================================
    // 8. ASISTENCIA CLÍNICA CON IA SERENA (GEMINI)
    // =============================================================
    async analyzeWithSerena(patientId) {
        const card = document.getElementById('serenaSystemicAnalysisCard');
        if (!card) return;

        if (!this.currentGenogram || !this.currentGenogram.members || this.currentGenogram.members.length < 2) {
            alert('Agrega al menos a los padres o familiares clave para poder realizar un análisis sistémico riguroso.');
            return;
        }

        card.style.display = 'block';
        card.innerHTML = `
        <div class="serena-loading" style="padding:20px;text-align:center;">
            <div class="spinner" style="margin:0 auto 12px auto;"></div>
            <p><strong>SERENA está analizando la estructura del genograma...</strong></p>
            <small style="color:var(--text-tertiary);">Detectando triangulaciones de Bowen, pautas transgeneracionales y factores de contención.</small>
        </div>`;

        // Resumen estructurado del genograma para el prompt de IA
        const summaryData = {
            paciente: this.currentGenogram.members.find(m => m.isIndex),
            miembros: this.currentGenogram.members.map(m => ({
                nombre: m.name,
                genero: m.gender,
                edad: m.age,
                generacion: m.generation,
                convive: m.inHousehold,
                fallecido: m.isDeceased,
                patologias: m.clinicalConditions
            })),
            uniones: this.currentGenogram.unions.map(u => ({
                pareja1: this.currentGenogram.members.find(m => m.id === u.partner1Id)?.name,
                pareja2: this.currentGenogram.members.find(m => m.id === u.partner2Id)?.name,
                estado: u.type,
                anos: u.year
            })),
            dinamicasAfectivas: (this.currentGenogram.relationships || []).map(r => ({
                de: this.currentGenogram.members.find(m => m.id === r.fromId)?.name,
                hacia: this.currentGenogram.members.find(m => m.id === r.toId)?.name,
                pauta: r.type,
                notas: r.notes
            }))
        };

        const prompt = `Actúa como SERENA, copiloto clínico experto en Terapia Familiar Sistémica (Murray Bowen, Salvador Minuchin y Monica McGoldrick).
Analiza el siguiente genograma clínico familiar del paciente:
${JSON.stringify(summaryData, null, 2)}

Genera una formulación clínica sistémica estructurada en markdown que incluya:
1. **Estructura y Jerarquía Familiar**: Dinámica de límites (claros, difusos o rígidos), diferenciación del self y coresidencia.
2. **Triangulaciones y Dinámicas de Bowen**: Identificación de triángulos relacionales, alianzas o coaliciones intergeneracionales.
3. **Pautas y Transmisión Transgeneracional**: Detección de patrones repetidos (depresión, adicciones, rupturas conyugales o cortes emocionales).
4. **Figuras de Protección y Resiliencia**: Miembros que representan recursos nutricios para el paciente.
5. **3 Preguntas Circulares Sugeridas**: Para profundizar en las próximas sesiones terapéuticas.

Mantén un tono clínico, ético, empático y orientado a la intervención psicoterapéutica.`;

        try {
            let aiText = '';
            // Intentar llamada al backend seguro `/api/v1/clinical/ai-query`
            const token = localStorage.getItem('psico_session_token') || '';
            const res = await fetch('/api/v1/clinical/ai-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ prompt })
            });

            if (res.ok) {
                const data = await res.json();
                aiText = data.text || data.response || data.result || '';
            }

            // Fallback sintético asistido si no hay API key de Gemini activa en el servidor
            if (!aiText) {
                aiText = this.generateLocalSystemicInsight(summaryData);
            }

            const formattedHtml = typeof marked !== 'undefined' ? marked.parse(aiText) : aiText.replace(/\n/g, '<br>');

            card.innerHTML = `
            <div class="serena-card-content" style="background:var(--bg-card);border:1px solid #0d9488;border-radius:12px;padding:20px;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--border-primary);padding-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="serena-symbol.svg" alt="SERENA" style="width:28px;height:28px;" onerror="this.style.display='none'">
                        <h4 style="margin:0;color:#0d9488;"><i class="fas fa-brain"></i> Formulación Sistémica Asistida por SERENA</h4>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-sm btn-secondary" onclick="GenogramModule.copyAiInsightToNotes()" title="Copiar este análisis a la formulación del expediente">
                            <i class="fas fa-copy"></i> Copiar a Formulación
                        </button>
                        <button class="btn-icon" onclick="document.getElementById('serenaSystemicAnalysisCard').style.display='none'"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="serena-markdown-body" id="serenaInsightBody" style="line-height:1.6;font-size:13.5px;color:var(--text-primary);">
                    ${formattedHtml}
                </div>
            </div>`;

        } catch (e) {
            console.warn('Error en análisis SERENA:', e);
            const fallbackText = this.generateLocalSystemicInsight(summaryData);
            card.innerHTML = `
            <div class="serena-card-content" style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:12px;padding:20px;">
                <h4 style="color:#0d9488;margin-bottom:10px;"><i class="fas fa-brain"></i> Formulación Sistémica Heurística</h4>
                <div id="serenaInsightBody">${fallbackText.replace(/\n/g, '<br>')}</div>
            </div>`;
        }
    },

    generateLocalSystemicInsight(summary) {
        const p = summary.paciente;
        const householdCount = summary.miembros.filter(m => m.convive).length;
        const conflicts = summary.dinamicasAfectivas.filter(d => d.pauta === 'conflictual' || d.pauta === 'enmeshed_conflict');
        const enmeshed = summary.dinamicasAfectivas.filter(d => d.pauta === 'enmeshed' || d.pauta === 'enmeshed_conflict');
        const cutoffs = summary.dinamicasAfectivas.filter(d => d.pauta === 'cutoff');

        return `### 🧬 Formulación Sistémica Preliminar (SERENA)

**1. Estructura y Coresidencia Familiar:**
* El sistema familiar evaluado cuenta con **${summary.miembros.length} miembros documentados**, de los cuales **${householdCount} conviven actualmente en el hogar**.
* Paciente índice (${p?.nombre || 'Paciente'}, ${p?.edad || '—'} años) situado en la Generación III, interactuando con subsistemas parentales y conyugales.

**2. Dinámica Relacional y Pautas de Bowen:**
${enmeshed.length > 0 ? `* **Sobreinvolucramiento / Fusión:** Se observan vínculos con límites difusos (${enmeshed.map(e => `${e.de} ↔ ${e.hacia}`).join(', ')}), lo que puede elevar la reactividad emocional y dificultar la diferenciación del self.` : '* No se identifican pautas de sobreinvolucramiento severo en el mapa inicial.'}
${conflicts.length > 0 ? `* **Tensión y Reactividad:** Foco conflictivo detectado en ${conflicts.map(c => `${c.de} ↔ ${c.hacia}`).join(', ')}. Sugerido explorar si el síntoma del paciente opera como estabilizador o distractor del conflicto diádico.` : '* Clima relacional sin polarizaciones de alta hostilidad registradas.'}
${cutoffs.length > 0 ? `* **Cortes Emocionales (Cut-offs):** Ruptura activa de contacto en ${cutoffs.map(c => `${c.de} ↔ ${c.hacia}`).join(', ')}. En la teoría de Bowen, el corte emocional a menudo encubre alta reactividad no resuelta.` : ''}

**3. Preguntas Circulares Recomendadas para la Sesión:**
1. *"Cuando surge tensión entre los miembros del hogar, ¿quién suele intervenir primero y cómo reacciona cada uno?"*
2. *"¿En qué medida el motivo de consulta actual se asemeja a dificultades que vivieron generaciones anteriores en la familia?"*
3. *"Si este síntoma comenzara a ceder, ¿qué otra conversación o tema pendiente emergería en el hogar?"*`;
    },

    copyAiInsightToNotes() {
        const text = document.getElementById('serenaInsightBody')?.innerText || '';
        const notesArea = document.getElementById('genogramSystemicNotes');
        if (notesArea && text) {
            notesArea.value = (notesArea.value ? notesArea.value + '\n\n' : '') + text;
            this.saveNotes(this.currentGenogram?.patientId);
            if (typeof showToast === 'function') showToast('Análisis copiado a la formulación sistémica', 'success');
        }
    },

    // =============================================================
    // 10. ASISTENTE GUIADO POR PREGUNTAS (HASTA 2DA LÍNEA FAMILIAR)
    // =============================================================
    wizardStep: 1,
    wizardData: null,

    openWizardModal(patientId) {
        let pName = 'Paciente';
        let pAge = 30;
        let pGender = 'M';
        let fatherName = 'Padre';
        let motherName = 'Madre';

        if (typeof AppState !== 'undefined' && Array.isArray(AppState.patients)) {
            const patient = AppState.patients.find(p => String(p.id) === String(patientId));
            if (patient) {
                pName = patient.name || 'Paciente';
                pAge = patient.age || (patient.birthdate ? this.calcAge(patient.birthdate) : 30);
                pGender = (patient.gender === 'F' || patient.gender === 'femenino' || (patient.name || '').toLowerCase().endsWith('a')) ? 'F' : 'M';
                fatherName = patient.fatherName || (patient.guardian_relation === 'Padre' ? patient.guardian_name : 'Padre');
                motherName = patient.motherName || (patient.guardian_relation === 'Madre' ? patient.guardian_name : 'Madre');
            }
        }

        const nowYear = new Date().getFullYear();

        this.wizardStep = 1;
        this.wizardData = {
            patientId: patientId || this.currentGenogram?.patientId,
            // 1. Abuelos
            paternalGrandpa: { name: 'Abuelo Paterno', gender: 'M', age: pAge + 54, isDeceased: true, deathYear: nowYear - 6 },
            paternalGrandma: { name: 'Abuela Paterna', gender: 'F', age: pAge + 52, isDeceased: false, deathYear: null },
            paternalUnion: 'married',
            maternalGrandpa: { name: 'Abuelo Materno', gender: 'M', age: pAge + 55, isDeceased: false, deathYear: null },
            maternalGrandma: { name: 'Abuela Materna', gender: 'F', age: pAge + 51, isDeceased: false, deathYear: null },
            maternalUnion: 'married',
            // 2. Tíos (Segunda línea familiar)
            paternalUncles: [
                { id: `u_p_${Date.now()}_1`, name: 'Tío Paterno', gender: 'M', age: pAge + 30, isDeceased: false }
            ],
            maternalUncles: [
                { id: `u_m_${Date.now()}_1`, name: 'Tía Materna', gender: 'F', age: pAge + 26, isDeceased: false }
            ],
            // 3. Padres
            father: { name: fatherName, gender: 'M', age: pAge + 28, isDeceased: false, inHousehold: true },
            mother: { name: motherName, gender: 'F', age: pAge + 26, isDeceased: false, inHousehold: true },
            parentsUnion: 'married',
            // 4. Paciente y Hermanos
            patient: { name: pName, gender: pGender, age: pAge, isIndex: true, inHousehold: true, occupation: '' },
            siblings: [
                { id: `sib_${Date.now()}_1`, name: 'Hermano/a', gender: pGender === 'M' ? 'F' : 'M', age: Math.max(1, pAge - 3), isDeceased: false, inHousehold: true }
            ],
            // 5. Pareja e Hijos
            hasPartner: false,
            partner: { name: 'Pareja', gender: pGender === 'M' ? 'F' : 'M', age: pAge, unionType: 'married', isDeceased: false, inHousehold: true },
            children: []
        };

        const modalHtml = `
        <div class="modal active" id="modalGenoWizard">
            <div class="modal-overlay" onclick="GenogramModule.closeModal('modalGenoWizard')"></div>
            <div class="modal-content modal-xl geno-wizard-card" style="max-width: 880px; margin: auto;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-magic" style="color:#0d9488;"></i> Asistente Familiar: Cuestionario de 2da Línea</h3>
                    <button class="btn-icon" onclick="GenogramModule.closeModal('modalGenoWizard')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="wizard-stepper" style="padding: 12px 20px 8px 20px;">
                    <div class="wizard-step-item active" id="wStepTab_1" onclick="GenogramModule.setWizardStep(1)">
                        <span class="wizard-step-badge">1</span> Abuelos (1ra Gen)
                    </div>
                    <div class="wizard-step-item" id="wStepTab_2" onclick="GenogramModule.setWizardStep(2)">
                        <span class="wizard-step-badge">2</span> Tíos (2da Línea)
                    </div>
                    <div class="wizard-step-item" id="wStepTab_3" onclick="GenogramModule.setWizardStep(3)">
                        <span class="wizard-step-badge">3</span> Padres
                    </div>
                    <div class="wizard-step-item" id="wStepTab_4" onclick="GenogramModule.setWizardStep(4)">
                        <span class="wizard-step-badge">4</span> Paciente & Hermanos
                    </div>
                    <div class="wizard-step-item" id="wStepTab_5" onclick="GenogramModule.setWizardStep(5)">
                        <span class="wizard-step-badge">5</span> Pareja & Hijos
                    </div>
                </div>

                <div class="geno-wizard-body" id="genoWizardBody">
                    ${this.renderWizardStepView(1)}
                </div>

                <div class="modal-footer" style="padding: 16px 20px; border-top: 1px solid var(--border-primary); display:flex;justify-content:space-between;align-items:center;">
                    <button class="btn-secondary" id="btnWizPrev" onclick="GenogramModule.prevWizardStep()" style="visibility:hidden;">
                        <i class="fas fa-arrow-left"></i> Anterior
                    </button>
                    <div style="display:flex;gap:10px;">
                        <button class="btn-secondary" onclick="GenogramModule.closeModal('modalGenoWizard')">Cancelar</button>
                        <button class="btn-primary" id="btnWizNext" onclick="GenogramModule.nextWizardStep()">
                            Siguiente <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        this.injectModal(modalHtml);
    },

    setWizardStep(step) {
        this.wizardStep = step;
        for (let i = 1; i <= 5; i++) {
            const tab = document.getElementById(`wStepTab_${i}`);
            if (tab) {
                if (i === step) tab.classList.add('active');
                else tab.classList.remove('active');
            }
        }
        const body = document.getElementById('genoWizardBody');
        if (body) body.innerHTML = this.renderWizardStepView(step);

        const btnPrev = document.getElementById('btnWizPrev');
        const btnNext = document.getElementById('btnWizNext');
        if (btnPrev) btnPrev.style.visibility = step === 1 ? 'hidden' : 'visible';
        if (btnNext) {
            if (step === 5) {
                btnNext.innerHTML = '<i class="fas fa-check-circle"></i> Graficar Genograma Completo';
                btnNext.style.background = 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)';
            } else {
                btnNext.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
                btnNext.style.background = '';
            }
        }
    },

    nextWizardStep() {
        if (this.wizardStep < 5) {
            this.setWizardStep(this.wizardStep + 1);
        } else {
            this.generateAndPlotFromWizard();
        }
    },

    prevWizardStep() {
        if (this.wizardStep > 1) {
            this.setWizardStep(this.wizardStep - 1);
        }
    },

    renderWizardStepView(step) {
        if (step === 1) return this.renderWizardStep1();
        if (step === 2) return this.renderWizardStep2();
        if (step === 3) return this.renderWizardStep3();
        if (step === 4) return this.renderWizardStep4();
        if (step === 5) return this.renderWizardStep5();
        return '';
    },

    // PASO 1: ABUELOS (PATERNO Y MATERNO)
    renderWizardStep1() {
        const d = this.wizardData;
        return `
        <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                Registra la primera generación familiar (abuelos paternos y maternos), su sexo, estado vital y tipo de matrimonio.
            </p>

            <!-- Rama Paterna -->
            <div class="wizard-section-box">
                <div class="wizard-section-title"><i class="fas fa-users"></i> Abuelos de la Rama Paterna</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
                    <!-- Abuelo Paterno -->
                    <div class="wizard-member-row">
                        <strong>Abuelo Paterno (Varón ▢)</strong>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:11px;">Nombre</label>
                            <input type="text" class="form-control" value="${d.paternalGrandpa.name}"
                                   onchange="GenogramModule.wizardData.paternalGrandpa.name = this.value">
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:11px;">Edad / Muerte</label>
                                <input type="number" class="form-control" value="${d.paternalGrandpa.age}"
                                       onchange="GenogramModule.wizardData.paternalGrandpa.age = parseInt(this.value,10)">
                            </div>
                            <div style="flex:1;padding-top:14px;">
                                <div class="btn-choice-group">
                                    <button type="button" class="btn-choice ${!d.paternalGrandpa.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('paternalGrandpa', false)">Vivo ✓</button>
                                    <button type="button" class="btn-choice ${d.paternalGrandpa.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('paternalGrandpa', true)">Fallecido ✝</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Abuela Paterna -->
                    <div class="wizard-member-row">
                        <strong>Abuela Paterna (Mujer ◯)</strong>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:11px;">Nombre</label>
                            <input type="text" class="form-control" value="${d.paternalGrandma.name}"
                                   onchange="GenogramModule.wizardData.paternalGrandma.name = this.value">
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:11px;">Edad / Muerte</label>
                                <input type="number" class="form-control" value="${d.paternalGrandma.age}"
                                       onchange="GenogramModule.wizardData.paternalGrandma.age = parseInt(this.value,10)">
                            </div>
                            <div style="flex:1;padding-top:14px;">
                                <div class="btn-choice-group">
                                    <button type="button" class="btn-choice ${!d.paternalGrandma.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('paternalGrandma', false)">Viva ✓</button>
                                    <button type="button" class="btn-choice ${d.paternalGrandma.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('paternalGrandma', true)">Fallecida ✝</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <label style="font-size:12px;font-weight:600;">Estado de la Unión de Abuelos Paternos:</label>
                    <div class="btn-choice-group" style="margin-top:6px;">
                        <button type="button" class="btn-choice ${d.paternalUnion === 'married' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('paternalUnion', 'married')">Matrimonio Formal</button>
                        <button type="button" class="btn-choice ${d.paternalUnion === 'cohabiting' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('paternalUnion', 'cohabiting')">Unión Libre</button>
                        <button type="button" class="btn-choice ${d.paternalUnion === 'separated' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('paternalUnion', 'separated')">Separados</button>
                        <button type="button" class="btn-choice ${d.paternalUnion === 'divorced' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('paternalUnion', 'divorced')">Divorciados</button>
                    </div>
                </div>
            </div>

            <!-- Rama Materna -->
            <div class="wizard-section-box">
                <div class="wizard-section-title"><i class="fas fa-users"></i> Abuelos de la Rama Materna</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
                    <!-- Abuelo Materno -->
                    <div class="wizard-member-row">
                        <strong>Abuelo Materno (Varón ▢)</strong>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:11px;">Nombre</label>
                            <input type="text" class="form-control" value="${d.maternalGrandpa.name}"
                                   onchange="GenogramModule.wizardData.maternalGrandpa.name = this.value">
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:11px;">Edad / Muerte</label>
                                <input type="number" class="form-control" value="${d.maternalGrandpa.age}"
                                       onchange="GenogramModule.wizardData.maternalGrandpa.age = parseInt(this.value,10)">
                            </div>
                            <div style="flex:1;padding-top:14px;">
                                <div class="btn-choice-group">
                                    <button type="button" class="btn-choice ${!d.maternalGrandpa.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('maternalGrandpa', false)">Vivo ✓</button>
                                    <button type="button" class="btn-choice ${d.maternalGrandpa.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('maternalGrandpa', true)">Fallecido ✝</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Abuela Materna -->
                    <div class="wizard-member-row">
                        <strong>Abuela Materna (Mujer ◯)</strong>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:11px;">Nombre</label>
                            <input type="text" class="form-control" value="${d.maternalGrandma.name}"
                                   onchange="GenogramModule.wizardData.maternalGrandma.name = this.value">
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="flex:1;">
                                <label style="font-size:11px;">Edad / Muerte</label>
                                <input type="number" class="form-control" value="${d.maternalGrandma.age}"
                                       onchange="GenogramModule.wizardData.maternalGrandma.age = parseInt(this.value,10)">
                            </div>
                            <div style="flex:1;padding-top:14px;">
                                <div class="btn-choice-group">
                                    <button type="button" class="btn-choice ${!d.maternalGrandma.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('maternalGrandma', false)">Viva ✓</button>
                                    <button type="button" class="btn-choice ${d.maternalGrandma.isDeceased ? 'active' : ''}"
                                            onclick="GenogramModule.toggleGrandpaDeceased('maternalGrandma', true)">Fallecida ✝</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <label style="font-size:12px;font-weight:600;">Estado de la Unión de Abuelos Maternos:</label>
                    <div class="btn-choice-group" style="margin-top:6px;">
                        <button type="button" class="btn-choice ${d.maternalUnion === 'married' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('maternalUnion', 'married')">Matrimonio Formal</button>
                        <button type="button" class="btn-choice ${d.maternalUnion === 'cohabiting' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('maternalUnion', 'cohabiting')">Unión Libre</button>
                        <button type="button" class="btn-choice ${d.maternalUnion === 'separated' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('maternalUnion', 'separated')">Separados</button>
                        <button type="button" class="btn-choice ${d.maternalUnion === 'divorced' ? 'active' : ''}"
                                onclick="GenogramModule.setUnionChoice('maternalUnion', 'divorced')">Divorciados</button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    toggleGrandpaDeceased(field, val) {
        if (this.wizardData && this.wizardData[field]) {
            this.wizardData[field].isDeceased = val;
            this.setWizardStep(1);
        }
    },

    setUnionChoice(field, val) {
        if (this.wizardData) {
            this.wizardData[field] = val;
            this.setWizardStep(this.wizardStep);
        }
    },

    // PASO 2: TÍOS (SEGUNDA LÍNEA FAMILIAR)
    renderWizardStep2() {
        const d = this.wizardData;
        return `
        <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                Registra la segunda línea familiar colateral: tíos paternos (hermanos del padre) y tíos maternos (hermanos de la madre).
            </p>

            <!-- Tíos Paternos -->
            <div class="wizard-section-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div class="wizard-section-title" style="margin:0;"><i class="fas fa-user-friends"></i> Tíos Paternos (Hermanos del Padre)</div>
                    <button type="button" class="btn-sm btn-secondary" onclick="GenogramModule.addUncle('paternal')">
                        <i class="fas fa-plus"></i> Añadir Tío/a Paterno
                    </button>
                </div>
                ${d.paternalUncles.length === 0 ? '<p style="font-size:12px;color:var(--text-tertiary);">No hay tíos paternos registrados.</p>' : ''}
                ${d.paternalUncles.map(u => `
                    <div class="wizard-member-row" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
                        <input type="text" class="form-control" style="flex:2;" value="${u.name}" placeholder="Nombre"
                               onchange="GenogramModule.updateUncle('paternal', '${u.id}', 'name', this.value)">
                        <div class="btn-choice-group" style="flex:1.5;">
                            <button type="button" class="btn-choice ${u.gender === 'M' ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('paternal', '${u.id}', 'gender', 'M')">Varón ▢</button>
                            <button type="button" class="btn-choice ${u.gender === 'F' ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('paternal', '${u.id}', 'gender', 'F')">Mujer ◯</button>
                        </div>
                        <input type="number" class="form-control" style="width:75px;" value="${u.age || ''}" placeholder="Edad"
                               onchange="GenogramModule.updateUncle('paternal', '${u.id}', 'age', parseInt(this.value,10))">
                        <div class="btn-choice-group" style="flex:1.2;">
                            <button type="button" class="btn-choice ${!u.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('paternal', '${u.id}', 'isDeceased', false)">Vivo</button>
                            <button type="button" class="btn-choice ${u.gender && u.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('paternal', '${u.id}', 'isDeceased', true)">✝</button>
                        </div>
                        <button type="button" class="btn-icon" style="color:#ef4444;" onclick="GenogramModule.removeUncle('paternal', '${u.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>

            <!-- Tíos Maternos -->
            <div class="wizard-section-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div class="wizard-section-title" style="margin:0;"><i class="fas fa-user-friends"></i> Tíos Maternos (Hermanos de la Madre)</div>
                    <button type="button" class="btn-sm btn-secondary" onclick="GenogramModule.addUncle('maternal')">
                        <i class="fas fa-plus"></i> Añadir Tío/a Materno
                    </button>
                </div>
                ${d.maternalUncles.length === 0 ? '<p style="font-size:12px;color:var(--text-tertiary);">No hay tíos maternos registrados.</p>' : ''}
                ${d.maternalUncles.map(u => `
                    <div class="wizard-member-row" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
                        <input type="text" class="form-control" style="flex:2;" value="${u.name}" placeholder="Nombre"
                               onchange="GenogramModule.updateUncle('maternal', '${u.id}', 'name', this.value)">
                        <div class="btn-choice-group" style="flex:1.5;">
                            <button type="button" class="btn-choice ${u.gender === 'M' ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('maternal', '${u.id}', 'gender', 'M')">Varón ▢</button>
                            <button type="button" class="btn-choice ${u.gender === 'F' ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('maternal', '${u.id}', 'gender', 'F')">Mujer ◯</button>
                        </div>
                        <input type="number" class="form-control" style="width:75px;" value="${u.age || ''}" placeholder="Edad"
                               onchange="GenogramModule.updateUncle('maternal', '${u.id}', 'age', parseInt(this.value,10))">
                        <div class="btn-choice-group" style="flex:1.2;">
                            <button type="button" class="btn-choice ${!u.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('maternal', '${u.id}', 'isDeceased', false)">Vivo</button>
                            <button type="button" class="btn-choice ${u.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateUncle('maternal', '${u.id}', 'isDeceased', true)">✝</button>
                        </div>
                        <button type="button" class="btn-icon" style="color:#ef4444;" onclick="GenogramModule.removeUncle('maternal', '${u.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    addUncle(branch) {
        const list = branch === 'paternal' ? this.wizardData.paternalUncles : this.wizardData.maternalUncles;
        list.push({
            id: `u_${branch}_${Date.now()}`,
            name: branch === 'paternal' ? `Tío/a Paterno ${list.length + 1}` : `Tío/a Materno ${list.length + 1}`,
            gender: 'M',
            age: 40,
            isDeceased: false
        });
        this.setWizardStep(2);
    },

    removeUncle(branch, id) {
        if (branch === 'paternal') {
            this.wizardData.paternalUncles = this.wizardData.paternalUncles.filter(u => u.id !== id);
        } else {
            this.wizardData.maternalUncles = this.wizardData.maternalUncles.filter(u => u.id !== id);
        }
        this.setWizardStep(2);
    },

    updateUncle(branch, id, key, val) {
        const list = branch === 'paternal' ? this.wizardData.paternalUncles : this.wizardData.maternalUncles;
        const item = list.find(u => u.id === id);
        if (item) {
            item[key] = val;
            this.setWizardStep(2);
        }
    },

    // PASO 3: PADRES
    renderWizardStep3() {
        const d = this.wizardData;
        return `
        <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                Define los datos y la unión conyugal de los progenitores directos del paciente.
            </p>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
                <!-- Padre -->
                <div class="wizard-section-box">
                    <div class="wizard-section-title"><i class="fas fa-male"></i> Padre del Paciente (Varón ▢)</div>
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" class="form-control" value="${d.father.name}"
                               onchange="GenogramModule.wizardData.father.name = this.value">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Edad</label>
                            <input type="number" class="form-control" value="${d.father.age}"
                                   onchange="GenogramModule.wizardData.father.age = parseInt(this.value,10)">
                        </div>
                        <div class="form-group">
                            <label>Estado Vital</label>
                            <div class="btn-choice-group">
                                <button type="button" class="btn-choice ${!d.father.isDeceased ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.father.isDeceased = false; GenogramModule.setWizardStep(3);">Vivo ✓</button>
                                <button type="button" class="btn-choice ${d.father.isDeceased ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.father.isDeceased = true; GenogramModule.setWizardStep(3);">Fallecido ✝</button>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:8px;">
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
                            <input type="checkbox" ${d.father.inHousehold ? 'checked' : ''}
                                   onchange="GenogramModule.wizardData.father.inHousehold = this.checked;"> Conviviente en el hogar del paciente
                        </label>
                    </div>
                </div>

                <!-- Madre -->
                <div class="wizard-section-box">
                    <div class="wizard-section-title"><i class="fas fa-female"></i> Madre del Paciente (Mujer ◯)</div>
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" class="form-control" value="${d.mother.name}"
                               onchange="GenogramModule.wizardData.mother.name = this.value">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Edad</label>
                            <input type="number" class="form-control" value="${d.mother.age}"
                                   onchange="GenogramModule.wizardData.mother.age = parseInt(this.value,10)">
                        </div>
                        <div class="form-group">
                            <label>Estado Vital</label>
                            <div class="btn-choice-group">
                                <button type="button" class="btn-choice ${!d.mother.isDeceased ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.mother.isDeceased = false; GenogramModule.setWizardStep(3);">Viva ✓</button>
                                <button type="button" class="btn-choice ${d.mother.isDeceased ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.mother.isDeceased = true; GenogramModule.setWizardStep(3);">Fallecida ✝</button>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:8px;">
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
                            <input type="checkbox" ${d.mother.inHousehold ? 'checked' : ''}
                                   onchange="GenogramModule.wizardData.mother.inHousehold = this.checked;"> Conviviente en el hogar del paciente
                        </label>
                    </div>
                </div>
            </div>

            <!-- Unión Conyugal de los Padres -->
            <div class="wizard-section-box">
                <div class="wizard-section-title"><i class="fas fa-ring"></i> Vínculo Matrimonial / Conyugal entre los Padres</div>
                <div class="btn-choice-group">
                    <button type="button" class="btn-choice ${d.parentsUnion === 'married' ? 'active' : ''}"
                            onclick="GenogramModule.setUnionChoice('parentsUnion', 'married')">Matrimonio Formal (Línea continua)</button>
                    <button type="button" class="btn-choice ${d.parentsUnion === 'cohabiting' ? 'active' : ''}"
                            onclick="GenogramModule.setUnionChoice('parentsUnion', 'cohabiting')">Unión Libre / Convivencia (Línea de trazos)</button>
                    <button type="button" class="btn-choice ${d.parentsUnion === 'separated' ? 'active' : ''}"
                            onclick="GenogramModule.setUnionChoice('parentsUnion', 'separated')">Separación (Barra diagonal /)</button>
                    <button type="button" class="btn-choice ${d.parentsUnion === 'divorced' ? 'active' : ''}"
                            onclick="GenogramModule.setUnionChoice('parentsUnion', 'divorced')">Divorcio Legal (Dos barras //)</button>
                </div>
            </div>
        </div>`;
    },

    // PASO 4: PACIENTE Y HERMANOS
    renderWizardStep4() {
        const d = this.wizardData;
        return `
        <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                Identificación del paciente y sus hermanos en orden cronológico.
            </p>

            <!-- Paciente Identificado -->
            <div class="wizard-section-box">
                <div class="wizard-section-title"><i class="fas fa-user-check"></i> Paciente Identificado (Caso Índice con Doble Contorno)</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
                    <div>
                        <label style="font-size:11px;">Nombre Completo</label>
                        <input type="text" class="form-control" value="${d.patient.name}"
                               onchange="GenogramModule.wizardData.patient.name = this.value">
                    </div>
                    <div>
                        <label style="font-size:11px;">Género (Símbolo)</label>
                        <div class="btn-choice-group">
                            <button type="button" class="btn-choice ${d.patient.gender === 'M' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.patient.gender = 'M'; GenogramModule.setWizardStep(4);">Varón ▢</button>
                            <button type="button" class="btn-choice ${d.patient.gender === 'F' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.patient.gender = 'F'; GenogramModule.setWizardStep(4);">Mujer ◯</button>
                            <button type="button" class="btn-choice ${d.patient.gender === 'NB' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.patient.gender = 'NB'; GenogramModule.setWizardStep(4);">NB ⬡</button>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:11px;">Edad</label>
                        <input type="number" class="form-control" value="${d.patient.age}"
                               onchange="GenogramModule.wizardData.patient.age = parseInt(this.value,10)">
                    </div>
                </div>
            </div>

            <!-- Hermanos -->
            <div class="wizard-section-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div class="wizard-section-title" style="margin:0;"><i class="fas fa-users"></i> Hermanos del Paciente</div>
                    <button type="button" class="btn-sm btn-secondary" onclick="GenogramModule.addSibling()">
                        <i class="fas fa-plus"></i> Añadir Hermano/a
                    </button>
                </div>
                ${d.siblings.length === 0 ? '<p style="font-size:12px;color:var(--text-tertiary);">Es hijo/a único/a (sin hermanos registrados).</p>' : ''}
                ${d.siblings.map(s => `
                    <div class="wizard-member-row" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
                        <input type="text" class="form-control" style="flex:2;" value="${s.name}" placeholder="Nombre hermano/a"
                               onchange="GenogramModule.updateSibling('${s.id}', 'name', this.value)">
                        <div class="btn-choice-group" style="flex:1.8;">
                            <button type="button" class="btn-choice ${s.gender === 'M' ? 'active' : ''}"
                                    onclick="GenogramModule.updateSibling('${s.id}', 'gender', 'M')">Varón ▢</button>
                            <button type="button" class="btn-choice ${s.gender === 'F' ? 'active' : ''}"
                                    onclick="GenogramModule.updateSibling('${s.id}', 'gender', 'F')">Mujer ◯</button>
                        </div>
                        <input type="number" class="form-control" style="width:75px;" value="${s.age || ''}" placeholder="Edad"
                               onchange="GenogramModule.updateSibling('${s.id}', 'age', parseInt(this.value,10))">
                        <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
                            <input type="checkbox" ${s.inHousehold ? 'checked' : ''}
                                   onchange="GenogramModule.updateSibling('${s.id}', 'inHousehold', this.checked)"> Vive en casa
                        </label>
                        <div class="btn-choice-group">
                            <button type="button" class="btn-choice ${!s.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateSibling('${s.id}', 'isDeceased', false)">Vivo</button>
                            <button type="button" class="btn-choice ${s.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateSibling('${s.id}', 'isDeceased', true)">✝</button>
                        </div>
                        <button type="button" class="btn-icon" style="color:#ef4444;" onclick="GenogramModule.removeSibling('${s.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    addSibling() {
        this.wizardData.siblings.push({
            id: `sib_${Date.now()}`,
            name: `Hermano/a ${this.wizardData.siblings.length + 1}`,
            gender: 'F',
            age: 20,
            isDeceased: false,
            inHousehold: true
        });
        this.setWizardStep(4);
    },

    removeSibling(id) {
        this.wizardData.siblings = this.wizardData.siblings.filter(s => s.id !== id);
        this.setWizardStep(4);
    },

    updateSibling(id, key, val) {
        const item = this.wizardData.siblings.find(s => s.id === id);
        if (item) {
            item[key] = val;
            this.setWizardStep(4);
        }
    },

    // PASO 5: PAREJA E HIJOS (DESCENDENCIA)
    renderWizardStep5() {
        const d = this.wizardData;
        return `
        <div>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                Define si el paciente tiene cónyuge/pareja actual y los hijos (descendencia familiar).
            </p>

            <!-- Pregunta Pareja -->
            <div class="wizard-section-box">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <label style="font-size:13px;font-weight:700;color:var(--brand-deep);">¿El paciente tiene pareja o cónyuge actual?</label>
                    <div class="btn-choice-group">
                        <button type="button" class="btn-choice ${d.hasPartner ? 'active' : ''}"
                                onclick="GenogramModule.wizardData.hasPartner = true; GenogramModule.setWizardStep(5);">Sí ✓</button>
                        <button type="button" class="btn-choice ${!d.hasPartner ? 'active' : ''}"
                                onclick="GenogramModule.wizardData.hasPartner = false; GenogramModule.setWizardStep(5);">No (Soltero/a)</button>
                    </div>
                </div>

                ${d.hasPartner ? `
                <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-primary);">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:12px;">
                        <div>
                            <label style="font-size:11px;">Nombre de la Pareja</label>
                            <input type="text" class="form-control" value="${d.partner.name}"
                                   onchange="GenogramModule.wizardData.partner.name = this.value">
                        </div>
                        <div>
                            <label style="font-size:11px;">Género (Símbolo)</label>
                            <div class="btn-choice-group">
                                <button type="button" class="btn-choice ${d.partner.gender === 'F' ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.partner.gender = 'F'; GenogramModule.setWizardStep(5);">Mujer ◯</button>
                                <button type="button" class="btn-choice ${d.partner.gender === 'M' ? 'active' : ''}"
                                        onclick="GenogramModule.wizardData.partner.gender = 'M'; GenogramModule.setWizardStep(5);">Varón ▢</button>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:11px;">Edad</label>
                            <input type="number" class="form-control" value="${d.partner.age}"
                                   onchange="GenogramModule.wizardData.partner.age = parseInt(this.value,10)">
                        </div>
                    </div>

                    <div>
                        <label style="font-size:11px;font-weight:600;">Tipo de Matrimonio / Unión:</label>
                        <div class="btn-choice-group" style="margin-top:6px;">
                            <button type="button" class="btn-choice ${d.partner.unionType === 'married' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.partner.unionType = 'married'; GenogramModule.setWizardStep(5);">Matrimonio</button>
                            <button type="button" class="btn-choice ${d.partner.unionType === 'cohabiting' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.partner.unionType = 'cohabiting'; GenogramModule.setWizardStep(5);">Convivencia / Unión Libre</button>
                            <button type="button" class="btn-choice ${d.partner.unionType === 'separated' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.partner.unionType = 'separated'; GenogramModule.setWizardStep(5);">Separados</button>
                            <button type="button" class="btn-choice ${d.partner.unionType === 'divorced' ? 'active' : ''}"
                                    onclick="GenogramModule.wizardData.partner.unionType = 'divorced'; GenogramModule.setWizardStep(5);">Divorciados</button>
                        </div>
                    </div>
                </div>` : ''}
            </div>

            <!-- Hijos -->
            <div class="wizard-section-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div class="wizard-section-title" style="margin:0;"><i class="fas fa-baby"></i> Hijos del Paciente (Descendencia)</div>
                    <button type="button" class="btn-sm btn-secondary" onclick="GenogramModule.addChild()">
                        <i class="fas fa-plus"></i> Añadir Hijo/a
                    </button>
                </div>
                ${d.children.length === 0 ? '<p style="font-size:12px;color:var(--text-tertiary);">No tiene hijos registrados.</p>' : ''}
                ${d.children.map(c => `
                    <div class="wizard-member-row" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
                        <input type="text" class="form-control" style="flex:2;" value="${c.name}" placeholder="Nombre hijo/a"
                               onchange="GenogramModule.updateChild('${c.id}', 'name', this.value)">
                        <div class="btn-choice-group" style="flex:1.8;">
                            <button type="button" class="btn-choice ${c.gender === 'M' ? 'active' : ''}"
                                    onclick="GenogramModule.updateChild('${c.id}', 'gender', 'M')">Varón ▢</button>
                            <button type="button" class="btn-choice ${c.gender === 'F' ? 'active' : ''}"
                                    onclick="GenogramModule.updateChild('${c.id}', 'gender', 'F')">Mujer ◯</button>
                        </div>
                        <input type="number" class="form-control" style="width:75px;" value="${c.age || ''}" placeholder="Edad"
                               onchange="GenogramModule.updateChild('${c.id}', 'age', parseInt(this.value,10))">
                        <label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
                            <input type="checkbox" ${c.inHousehold ? 'checked' : ''}
                                   onchange="GenogramModule.updateChild('${c.id}', 'inHousehold', this.checked)"> En casa
                        </label>
                        <div class="btn-choice-group">
                            <button type="button" class="btn-choice ${!c.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateChild('${c.id}', 'isDeceased', false)">Vivo</button>
                            <button type="button" class="btn-choice ${c.isDeceased ? 'active' : ''}"
                                    onclick="GenogramModule.updateChild('${c.id}', 'isDeceased', true)">✝</button>
                        </div>
                        <button type="button" class="btn-icon" style="color:#ef4444;" onclick="GenogramModule.removeChild('${c.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    addChild() {
        this.wizardData.children.push({
            id: `ch_${Date.now()}`,
            name: `Hijo/a ${this.wizardData.children.length + 1}`,
            gender: 'M',
            age: 5,
            isDeceased: false,
            inHousehold: true
        });
        this.setWizardStep(5);
    },

    removeChild(id) {
        this.wizardData.children = this.wizardData.children.filter(c => c.id !== id);
        this.setWizardStep(5);
    },

    updateChild(id, key, val) {
        const item = this.wizardData.children.find(c => c.id === id);
        if (item) {
            item[key] = val;
            this.setWizardStep(5);
        }
    },

    // =============================================================
    // GENERAR Y GRAFICAR EL GENOGRAMA COMPLETO CON FIGURAS
    // =============================================================
    generateAndPlotFromWizard() {
        const d = this.wizardData;
        if (!d) return;

        const members = [];
        const unions = [];
        const children = [];
        const relationships = [];

        // Coordenadas Y por generación
        const yGenI = 80;    // Abuelos
        const yGenII = 210;  // Tíos y Padres
        const yGenIII = 350; // Paciente, Pareja y Hermanos
        const yGenIV = 480;  // Hijos

        // 1. GENERACIÓN I: ABUELOS PATERNO Y MATERNO
        // Abuelos paternos
        const mPaternalGpa = {
            id: 'm_gp_pat',
            name: d.paternalGrandpa.name || 'Abuelo Paterno',
            gender: 'M',
            age: d.paternalGrandpa.age || null,
            isDeceased: Boolean(d.paternalGrandpa.isDeceased),
            deathYear: d.paternalGrandpa.deathYear || null,
            generation: -1,
            x: 180,
            y: yGenI,
            inHousehold: false,
            clinicalConditions: []
        };
        const mPaternalGma = {
            id: 'm_gm_pat',
            name: d.paternalGrandma.name || 'Abuela Paterna',
            gender: 'F',
            age: d.paternalGrandma.age || null,
            isDeceased: Boolean(d.paternalGrandma.isDeceased),
            deathYear: d.paternalGrandma.deathYear || null,
            generation: -1,
            x: 290,
            y: yGenI,
            inHousehold: false,
            clinicalConditions: []
        };
        members.push(mPaternalGpa, mPaternalGma);

        const uPatGrandparents = {
            id: 'u_pat_gp',
            partner1Id: mPaternalGpa.id,
            partner2Id: mPaternalGma.id,
            type: d.paternalUnion || 'married'
        };
        unions.push(uPatGrandparents);

        // Abuelos maternos
        const mMaternalGpa = {
            id: 'm_gp_mat',
            name: d.maternalGrandpa.name || 'Abuelo Materno',
            gender: 'M',
            age: d.maternalGrandpa.age || null,
            isDeceased: Boolean(d.maternalGrandpa.isDeceased),
            deathYear: d.maternalGrandpa.deathYear || null,
            generation: -1,
            x: 670,
            y: yGenI,
            inHousehold: false,
            clinicalConditions: []
        };
        const mMaternalGma = {
            id: 'm_gm_mat',
            name: d.maternalGrandma.name || 'Abuela Materna',
            gender: 'F',
            age: d.maternalGrandma.age || null,
            isDeceased: Boolean(d.maternalGrandma.isDeceased),
            deathYear: d.maternalGrandma.deathYear || null,
            generation: -1,
            x: 780,
            y: yGenI,
            inHousehold: false,
            clinicalConditions: []
        };
        members.push(mMaternalGpa, mMaternalGma);

        const uMatGrandparents = {
            id: 'u_mat_gp',
            partner1Id: mMaternalGpa.id,
            partner2Id: mMaternalGma.id,
            type: d.maternalUnion || 'married'
        };
        unions.push(uMatGrandparents);

        // 2. GENERACIÓN II: TÍOS PATERNO, PADRE, MADRE, TÍOS MATERNO
        // Tíos paternos
        let unclePatX = 90;
        d.paternalUncles.forEach((u, idx) => {
            const mUncle = {
                id: `m_u_pat_${idx}`,
                name: u.name,
                gender: u.gender || 'M',
                age: u.age || null,
                isDeceased: Boolean(u.isDeceased),
                generation: 0,
                x: unclePatX,
                y: yGenII,
                inHousehold: false,
                clinicalConditions: []
            };
            members.push(mUncle);
            children.push({
                id: `c_u_pat_${idx}`,
                unionId: uPatGrandparents.id,
                childId: mUncle.id,
                type: 'biological'
            });
            unclePatX += 85;
        });

        // Padre
        const mFather = {
            id: 'm_father',
            name: d.father.name || 'Padre',
            gender: 'M',
            age: d.father.age || null,
            isDeceased: Boolean(d.father.isDeceased),
            generation: 0,
            x: 370,
            y: yGenII,
            inHousehold: Boolean(d.father.inHousehold),
            clinicalConditions: []
        };
        members.push(mFather);
        children.push({
            id: 'c_pat_father',
            unionId: uPatGrandparents.id,
            childId: mFather.id,
            type: 'biological'
        });

        // Madre
        const mMother = {
            id: 'm_mother',
            name: d.mother.name || 'Madre',
            gender: 'F',
            age: d.mother.age || null,
            isDeceased: Boolean(d.mother.isDeceased),
            generation: 0,
            x: 580,
            y: yGenII,
            inHousehold: Boolean(d.mother.inHousehold),
            clinicalConditions: []
        };
        members.push(mMother);
        children.push({
            id: 'c_mat_mother',
            unionId: uMatGrandparents.id,
            childId: mMother.id,
            type: 'biological'
        });

        // Tíos maternos
        let uncleMatX = 720;
        d.maternalUncles.forEach((u, idx) => {
            const mUncle = {
                id: `m_u_mat_${idx}`,
                name: u.name,
                gender: u.gender || 'F',
                age: u.age || null,
                isDeceased: Boolean(u.isDeceased),
                generation: 0,
                x: uncleMatX,
                y: yGenII,
                inHousehold: false,
                clinicalConditions: []
            };
            members.push(mUncle);
            children.push({
                id: `c_u_mat_${idx}`,
                unionId: uMatGrandparents.id,
                childId: mUncle.id,
                type: 'biological'
            });
            uncleMatX += 85;
        });

        // Unión de los Padres
        const uParents = {
            id: 'u_parents',
            partner1Id: mFather.id,
            partner2Id: mMother.id,
            type: d.parentsUnion || 'married'
        };
        unions.push(uParents);

        // 3. GENERACIÓN III: HERMANOS, PACIENTE ÍNDICE, PAREJA
        let sibCount = d.siblings.length;
        let startSibX = 475 - (sibCount * 60);

        d.siblings.forEach((s, idx) => {
            const mSib = {
                id: `m_sib_${idx}`,
                name: s.name,
                gender: s.gender || 'M',
                age: s.age || null,
                isDeceased: Boolean(s.isDeceased),
                generation: 1,
                x: startSibX + (idx * 90),
                y: yGenIII,
                inHousehold: Boolean(s.inHousehold),
                clinicalConditions: []
            };
            members.push(mSib);
            children.push({
                id: `c_sib_${idx}`,
                unionId: uParents.id,
                childId: mSib.id,
                type: 'biological'
            });
        });

        // Paciente Índice (Caso identificado)
        const pIndexX = 475;
        const mIndex = {
            id: 'p_index',
            name: d.patient.name || 'Paciente',
            gender: d.patient.gender || 'M',
            age: d.patient.age || null,
            isDeceased: false,
            isIndex: true,
            generation: 1,
            x: pIndexX,
            y: yGenIII,
            inHousehold: true,
            clinicalConditions: []
        };
        members.push(mIndex);
        children.push({
            id: 'c_index',
            unionId: uParents.id,
            childId: mIndex.id,
            type: 'biological'
        });

        // Pareja (si tiene)
        let uPatientPartner = null;
        if (d.hasPartner) {
            const mPartner = {
                id: 'm_partner',
                name: d.partner.name || 'Pareja',
                gender: d.partner.gender || (d.patient.gender === 'M' ? 'F' : 'M'),
                age: d.partner.age || null,
                isDeceased: Boolean(d.partner.isDeceased),
                isIndex: false,
                generation: 1,
                x: pIndexX + 100,
                y: yGenIII,
                inHousehold: Boolean(d.partner.inHousehold),
                clinicalConditions: []
            };
            members.push(mPartner);

            uPatientPartner = {
                id: 'u_patient_partner',
                partner1Id: mIndex.id,
                partner2Id: mPartner.id,
                type: d.partner.unionType || 'married'
            };
            unions.push(uPatientPartner);
        }

        // 4. GENERACIÓN IV: HIJOS
        if (d.children && d.children.length > 0) {
            let childX = pIndexX - ((d.children.length - 1) * 45);
            const parentUnionId = uPatientPartner ? uPatientPartner.id : uParents.id;

            d.children.forEach((c, idx) => {
                const mChild = {
                    id: `m_child_${idx}`,
                    name: c.name,
                    gender: c.gender || 'M',
                    age: c.age || null,
                    isDeceased: Boolean(c.isDeceased),
                    isIndex: false,
                    generation: 2,
                    x: childX + (idx * 95),
                    y: yGenIV,
                    inHousehold: Boolean(c.inHousehold),
                    clinicalConditions: []
                };
                members.push(mChild);
                children.push({
                    id: `c_child_${idx}`,
                    unionId: parentUnionId,
                    childId: mChild.id,
                    type: 'biological'
                });
            });
        }

        // Relación armónica de base
        relationships.push({
            id: 'r_p_mother',
            fromId: mIndex.id,
            toId: mMother.id,
            type: 'harmonious',
            notes: 'Vínculo base exploratorio'
        });

        // Construir nuevo genograma
        const generatedGeno = {
            patientId: d.patientId,
            version: '2.5-wizard-line2',
            updatedAt: new Date().toISOString(),
            members,
            unions,
            children,
            relationships,
            notes: 'Genograma completo generado mediante Asistente Guiado de 2da Línea Familiar (Abuelos, Tíos, Padres, Paciente, Hermanos e Hijos).'
        };

        this.currentGenogram = generatedGeno;
        this.saveCurrentGenogram(true);
        this.closeModal('modalGenoWizard');
        this.refreshCanvasFast();

        if (typeof showToast === 'function') {
            showToast('¡Genograma de 2da línea generado y graficado con éxito!', 'success');
        }
    },


    exportAsPng() {
        const svg = document.getElementById('genogramSvgCanvas');
        if (!svg) return;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Escalar 2x para resolución Retina / 300 DPI
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngURL = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngURL;
            const pName = (this.currentGenogram?.members.find(m => m.isIndex)?.name || 'Paciente').replace(/\s+/g, '_');
            downloadLink.download = `Genograma_${pName}_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(blobURL);
            if (typeof showToast === 'function') showToast('Genograma exportado en alta resolución (PNG)', 'success');
        };
        img.src = blobURL;
    }
};

// Exposición en el entorno del navegador y compatibilidad con Node.js para testing
if (typeof window !== 'undefined') {
    window.GenogramModule = GenogramModule;
}
if (typeof globalThis !== 'undefined') {
    globalThis.GenogramModule = GenogramModule;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GenogramModule };
}
