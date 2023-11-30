type TreeParams = {
	log: [number, number][],
	leaves: [number, number][],
	radius: number
}

const GAME_VERSION = getMCPEVersion().array[1];
const NEW_CORE_API = GAME_VERSION >= 16;

namespace TreeCapitator {
	const treeData: TreeParams[] = [];
	const dirtTiles = {
		2: true, // grass
		3: true, // dirt
		60: true, //farmland
	}
	dirtTiles[VanillaTileID.crimson_nylium] = true;
	dirtTiles[VanillaTileID.warped_nylium] = true;

	export let calculateDestroyTime = __config__.getBool("increase_tree_destroy_time");

	export function getTreeData(block: Tile): TreeParams {
		for (let i in treeData) {
			const tree = treeData[i];
			if (this.isTreeBlock(block, tree.log)){
				return tree;
			}
		}
		return null;
	}

	export function isTreeBlock(block: Tile, treeBlocks: [number, number][]): boolean {
		const id = block.id, data = block.data % 4;
		for (let tile of treeBlocks) {
			if (tile[0] == id && (tile[1] == -1 || tile[1] == data)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param blockID block numeric id
	 * @returns true if trees can grow on this tile, false otherwise
	 */
	export function isDirtTile(blockID: number): boolean {
		return dirtTiles[blockID] || false;
	}

	/**
	 * Registers mod tree.
	 * @params [id, data] or [[id1, data1], [id2, data2], ...], use -1 in data for all block variations
	 * @param leavesRadius radius from log in which leaves will be destroyed.
	 */
	export function registerTree(log: [number, number] | [number, number][], leaves: [number, number] | [number, number][], leavesRadius?: number): void;
	export function registerTree(log: any, leaves: any, leavesRadius: number = 5): void {
		if (typeof log[0] !== "object") log = [log];
		if (typeof leaves[0] !== "object") leaves = [leaves];
		treeData.push({log: log, leaves: leaves, radius: leavesRadius});
	}

	/**
	 * Registers block as a valid tree ground.
	 */
	export function registerDirtTile(blockID: number): void {
		dirtTiles[blockID] = true;
	}
}

TreeCapitator.registerTree([17, 0], [18, 0], 6); // oak
TreeCapitator.registerTree([17, 1], [18, 1], 5); // spruce
TreeCapitator.registerTree([17, 2], [18, 2], 5); // birch
TreeCapitator.registerTree([17, 3], [18, 3], 7); // jungle
TreeCapitator.registerTree([162, 0], [161, 0], 5); // acacia
TreeCapitator.registerTree([162, 1], [161, 1], 6); // dark oak
if (GAME_VERSION >= 16) {
	TreeCapitator.registerTree([VanillaTileID.crimson_stem, 1], [VanillaTileID.nether_wart_block, 1], 6);
	TreeCapitator.registerTree([VanillaTileID.warped_stem, 1], [VanillaTileID.warped_wart_block, 1], 6);
}

ModAPI.registerAPI("TreeCapitator", TreeCapitator);
