"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
function determineWinner(player1Score, player2Score, player1Time, player2Time) {
    if (player1Score > player2Score) {
        return 'player1';
    }
    else if (player2Score > player1Score) {
        return 'player2';
    }
    else {
        if (player1Time < player2Time) {
            return 'player1';
        }
        else if (player2Time < player1Time) {
            return 'player2';
        }
        else {
            return null;
        }
    }
}
describe('PK Battle System Property Tests', () => {
    test('Property 8: PK battle winner determination is fair and consistent', () => {
        fc.assert(fc.property(fc.record({
            player1Score: fc.integer({ min: 0, max: 10 }),
            player2Score: fc.integer({ min: 0, max: 10 }),
            player1Time: fc.integer({ min: 60, max: 600 }),
            player2Time: fc.integer({ min: 60, max: 600 }),
        }), (scenario) => {
            let expectedWinnerId = null;
            if (scenario.player1Score > scenario.player2Score) {
                expectedWinnerId = 'player1';
            }
            else if (scenario.player2Score > scenario.player1Score) {
                expectedWinnerId = 'player2';
            }
            else {
                if (scenario.player1Time < scenario.player2Time) {
                    expectedWinnerId = 'player1';
                }
                else if (scenario.player2Time < scenario.player1Time) {
                    expectedWinnerId = 'player2';
                }
            }
            const actualWinner = determineWinner(scenario.player1Score, scenario.player2Score, scenario.player1Time, scenario.player2Time);
            expect(actualWinner).toBe(expectedWinnerId);
            if (scenario.player1Score > scenario.player2Score) {
                expect(actualWinner).toBe('player1');
            }
            if (scenario.player2Score > scenario.player1Score) {
                expect(actualWinner).toBe('player2');
            }
            if (scenario.player1Score === scenario.player2Score) {
                if (scenario.player1Time < scenario.player2Time) {
                    expect(actualWinner).toBe('player1');
                }
                else if (scenario.player2Time < scenario.player1Time) {
                    expect(actualWinner).toBe('player2');
                }
                else {
                    expect(actualWinner).toBe(null);
                }
            }
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=pkBattleSystem.test.js.map