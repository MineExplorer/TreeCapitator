namespace TreeCapitator {
	let TreeData = [];
	let DirtTiles = {
		2: true,
		3: true,
		60: true
	}
	export let calculateDestroyTime: boolean;

	export function getTreeData(block: Tile) {
		for (let i in TreeData){
			let tree = TreeData[i];
			if (this.isTreeBlock(block, tree.log)){
				return tree;
			}
		}
		return null;
	}

	export function isTreeBlock(block: Tile, treeBlocks: any) {
		let id = block.id, data = block.data % 4;
		for (let i in treeBlocks){
			block = treeBlocks[i];
			if (block[0] == id && (block[1] == -1 || block[1] == data)) {
				return true;
			}
		}
		return false;
	}

	export function isDirtTile(blockID: number): boolean {
		return DirtTiles[blockID] || false;
	}

	/** format
	[id, data] or [[id1, data1], [id2, data2], ...]
	use data -1 for all block variations
	*/
	export function registerTree(log: any, leaves: any, leavesRadius: number = 5) {
		if (typeof log[0] !== "object") log = [log];
		if (typeof leaves[0] !== "object") leaves = [leaves];
		TreeData.push({log: log, leaves: leaves, radius: leavesRadius});
	}

	export function registerDirtTile(blockID: number) {
		DirtTiles[blockID] = true;
	}
}

TreeCapitator.registerTree([17, 0], [18, 0], 6);
TreeCapitator.registerTree([17, 1], [18, 1]);
TreeCapitator.registerTree([17, 2], [18, 2]);
TreeCapitator.registerTree([17, 3], [18, 3], 7);
TreeCapitator.registerTree([162, 0], [161, 0]);
TreeCapitator.registerTree([162, 1], [161, 1], 6);

ModAPI.registerAPI("TreeCapitator", TreeCapitator);

Callback.addCallback("LevelLoaded", function(){
	TreeCapitator.calculateDestroyTime = __config__.getBool("calculate_destroy_time");
});