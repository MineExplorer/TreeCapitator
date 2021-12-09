type TreeParams = {
	log: [number, number][],
	leaves: [number, number][],
	radius: number
}

const NEW_CORE_API = getMCPEVersion().main === 28;

namespace TreeCapitator {
	const treeData = [];
	const dirtTiles = {
		2: true,
		3: true,
		60: true
	}

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
		for (let i in treeBlocks) {
			const tile = treeBlocks[i];
			if (tile[0] == id && (tile[1] == -1 || tile[1] == data)) {
				return true;
			}
		}
		return false;
	}

	export function isDirtTile(blockID: number): boolean {
		return dirtTiles[blockID] || false;
	}

	/** format
	[id, data] or [[id1, data1], [id2, data2], ...]
	use data -1 for all block variations
	*/
	export function registerTree(log: any, leaves: any, leavesRadius: number = 5): void {
		if (typeof log[0] !== "object") log = [log];
		if (typeof leaves[0] !== "object") leaves = [leaves];
		treeData.push({log: log, leaves: leaves, radius: leavesRadius});
	}

	export function registerDirtTile(blockID: number): void {
		dirtTiles[blockID] = true;
	}
}

TreeCapitator.registerTree([17, 0], [18, 0], 6);
TreeCapitator.registerTree([17, 1], [18, 1]);
TreeCapitator.registerTree([17, 2], [18, 2]);
TreeCapitator.registerTree([17, 3], [18, 3], 7);
TreeCapitator.registerTree([162, 0], [161, 0]);
TreeCapitator.registerTree([162, 1], [161, 1], 6);

ModAPI.registerAPI("TreeCapitator", TreeCapitator);
