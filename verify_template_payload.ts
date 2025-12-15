
import { buildEstimatePayload } from './src/services/sellsyPayloadBuilder';
import { ProjectData, GlobalConfig, TypologyCount, PhaseItem, BreakdownItem } from './src/types';

// Mock Data
const mockTypologies: TypologyCount = { T1: 5, T2: 0, T3: 0, T4: 0, T5: 0, Autre: 0 };
const mockProject: ProjectData = {
    id: 'test-proj',
    name: 'Test Project',
    client: 'Test Client',
    date: '2023-01-01',
    nbLogements: 5,
    surfaceTotal: 250,
    nbPhases: 1,
    typologies: mockTypologies,
    activePhases: [
        { id: 'p1', type: 'Deb chantier', isTemplate: true, templatePrice: 1000, templateItems: [{ name: 'Item A', price: 500, quantity: 1 }, { name: 'Item B', price: 500, quantity: 1 }] }
    ],
    complexity: { distance: 0, finition: 0, accessibilite: 0, etat: 0 },
    selectedSolution: {
        id: 'sol1', priceRaw: 1000, priceFinal: 1000, convergenceScore: 0, days: 1, methods: [], explanation: '', range: { min: 0, max: 0 }
    }
};

const mockConfig: GlobalConfig = {
    dailyRate: 840,
    productivity: { surfaceMin: 300, surfaceMax: 400, typologies: { T1: 8, T2: 7, T3: 6, T4: 5, T5: 4, Autre: 5 } },
    marketRate: {}
};

// Mock Breakdown (as calculated by calculationService)
const mockBreakdown: BreakdownItem[] = [
    {
        id: 'p1',
        phase: 'Deb chantier',
        totalPhase: 1000,
        typologies: { T1: 200 }, // 1000 / 5 units = 200 per unit
        templateItems: [{ name: 'Item A', price: 500, quantity: 1 }, { name: 'Item B', price: 500, quantity: 1 }]
    }
];

async function run() {
    console.log("--- Generating Sellsy Payload for 'Deb chantier' Template ---");

    try {
        const payload = await buildEstimatePayload(mockProject, '12345', mockConfig, mockBreakdown);

        console.log("PAYLOAD ROWS GENERATED:");
        payload.rows.forEach(row => {
            if (row.type === 'single') {
                console.log(`[ROW] Ref: ${row.reference} | Desc: ${row.description} | Qty: ${row.quantity} | Unit Price: ${row.unit_amount}`);
            } else if (row.type === 'comment') {
                console.log(`[COMMENT] ${row.text.substring(0, 50)}...`);
            } else {
                console.log(`[${row.type.toUpperCase()}]`);
            }
        });

        // specific check
        const hasTemplateItems = payload.rows.some(r => r.type === 'single' && (r.description.includes('Item A') || r.description.includes('Item B')));

        console.log("\n--- ANALYSIS ---");
        if (hasTemplateItems) {
            console.log("✅ The specific template items (Item A, Item B) ARE present in the payload.");
        } else {
            console.log("❌ The specific template items (Item A, Item B) are NOT present.");
            console.log("⚠️ The system is using the standard breakdown (ventilated by typology) instead of listing the template items.");
        }

    } catch (e) {
        console.error(e);
    }
}

run();
