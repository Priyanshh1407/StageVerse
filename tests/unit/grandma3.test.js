import { describe, it, expect } from 'vitest';
import { toGrandMA3Xml, checkPatch, patchAddress, grandMA3FileName, GMA3_DATA_VERSION } from '@/lib/patch/grandma3';

const fixture = (fixtureId, universe, address, channels = 20, profile = 'Robe BMFL Blade', mode = 'Mode 3') => ({ fixtureId, universe, address, channels, profile, mode });

describe('grandMA3 patch export', () => {
    it('writes the console notation for an address', () => {
        expect(patchAddress(1, 1)).toBe('1.001');
        expect(patchAddress(3, 47)).toBe('3.047');
        expect(patchAddress(12, 512)).toBe('12.512');
    });

    it('writes one fixture per patch line, in fixture-ID order, inside a layer named after the show', () => {
        const { xml, exported, skipped } = toGrandMA3Xml([fixture(201, 2, 1), fixture(101, 1, 1), fixture(102, 1, 21)], { name: 'World Tour', version: '1.4' });
        expect(exported).toBe(3);
        expect(skipped).toEqual([]);
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        expect(xml).toContain(`<GMA3 DataVersion="${GMA3_DATA_VERSION}">`);
        expect(xml).toContain('<Layer Name="World Tour">');
        const fids = [...xml.matchAll(/FID="(\d+)"/g)].map((m) => Number(m[1]));
        expect(fids).toEqual([101, 102, 201]);
        expect(xml).toContain('<Fixture Name="Robe BMFL Blade 101" FID="101" FixtureType="Robe BMFL Blade" Mode="Mode 3" Patch="1.001"/>');
        expect(xml).toContain('Patch="1.021"');
        expect(xml).toContain('Patch="2.001"');
        // well-formed: every opened element is closed
        expect(xml.match(/<Layer /g)).toHaveLength(1);
        expect(xml.trim().endsWith('</GMA3>')).toBe(true);
    });

    it('escapes names, and keeps comments legal', () => {
        const { xml } = toGrandMA3Xml([fixture(1, 1, 1, 10, 'Wash <"Big"> & Co', '16-bit')], { name: 'R&B -- Night' });
        expect(xml).toContain('FixtureType="Wash &lt;&quot;Big&quot;&gt; &amp; Co"');
        expect(xml).toContain('<Layer Name="R&amp;B -- Night">');
        const comments = [...xml.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]);
        for (const c of comments) expect(c.includes('--')).toBe(false);
    });

    it('leaves out lines that would break the import, and lists them', () => {
        const patch = [
            fixture(101, 1, 1, 20),
            fixture(102, 1, 15, 20),          // overlaps 101 (1-20 vs 15-34)
            fixture(103, 1, 500, 20),         // runs past 512
            fixture(104, 0, 1, 10),           // no universe 0
            fixture(105, 2, 1, 10),           // fine
            fixture(105, 3, 1, 10),           // same fixture ID twice
        ];
        const { valid, skipped } = checkPatch(patch);
        expect(valid.map((f) => f.fixtureId)).toEqual([]);
        expect(skipped).toHaveLength(6);
        const { xml, exported } = toGrandMA3Xml([...patch, fixture(301, 4, 1, 10)]);
        expect(exported).toBe(1);
        expect(xml).toContain('Patch="4.001"');
        expect(xml).toContain('Left out (6)');
        expect(xml).not.toContain('FID="102"');
    });

    it('names the file after the show', () => {
        expect(grandMA3FileName('WorldTour_Arena_vFinal.shw')).toBe('WorldTour_Arena_vFinal_grandMA3_patch.xml');
        expect(grandMA3FileName('Sunburn: Main / Stage')).toBe('Sunburn_Main_Stage_grandMA3_patch.xml');
        expect(grandMA3FileName('')).toBe('patch_grandMA3_patch.xml');
    });
});
