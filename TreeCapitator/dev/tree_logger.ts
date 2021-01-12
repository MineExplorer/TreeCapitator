namespace TreeLogger {
	class TreeDestroyData {
		log = {};
		leaves = {};
		logCount = 0;
		hasLeaves = false;
	}

	let destroyData: TreeDestroyData;

	function checkLog(region: BlockSource, x: number, y: number, z: number, tree: any): void {
		destroyData.log[x+':'+y+':'+z] = true;
		destroyData.logCount++;
		for (let xx = x - 1; xx <= x + 1; xx++)
		for (let zz = z - 1; zz <= z + 1; zz++)
		for (let yy = y; yy <= y + 1; yy++) {
			let block = region.getBlock(xx, yy, zz);
			if (!destroyData.hasLeaves && TreeCapitator.isTreeBlock(block, tree.leaves)) {
				destroyData.hasLeaves = true;
			}
			if (!destroyData.log[xx+':'+yy+':'+zz] && TreeCapitator.isTreeBlock(block, tree.log)) {
				checkLog(region, xx, yy, zz, tree);
			}
		}
	}

	function destroyLog(region: BlockSource, x: number, y: number, z: number, block: Tile, tree: any, toolLevel: number, enchant: ToolAPI.EnchantData): void {
		region.setBlock(x, y, z, 0, 0);
		//@ts-ignore
		let dropFunc = Block.dropFunctions[block.id];
		if (dropFunc) {
			let drop = dropFunc({x: x, y: y, z: z}, block.id, block.data, toolLevel, enchant);
			for (let i in drop) {
				region.spawnDroppedItem(x, y, z, drop[i][0], drop[i][1], drop[i][2]);
			}
		} else {
			region.spawnDroppedItem(x, y, z, block.id, 1, block.data%4);
		}
		checkLeavesFor6Sides(region, x, y, z, tree.leaves)
	}

	function destroyLeaves(region: BlockSource, x: number, y: number, z: number) {
		let block = region.getBlock(x, y, z);
		//@ts-ignore
		let dropFunc = Block.dropFunctions[block.id];
		if (dropFunc) {
			let enchant = ToolAPI.getEnchantExtraData();
			let item = {id: 0, count: 0, data: 0};
			let drop = dropFunc({x: x, y: y, z: z}, block.id, block.data, 0, enchant, item, region);
			for (let i in drop) {
				region.spawnDroppedItem(x, y, z, drop[i][0], drop[i][1], drop[i][2], drop[i][3] || null);
			}
		} else {
			if (block.id == 18) {
				if (block.data != 3 && Math.random() < 1/20 || block.data == 3 && Math.random() < 1/40) {
					region.spawnDroppedItem(x, y, z, 6, 1, block.data);
				}
				if (block.data == 0 && Math.random() < 1/200) {
					region.spawnDroppedItem(x, y, z, 260, 1, 0);
				}
			}
			if (block.id == 161 && Math.random() < 1/20) {
				region.spawnDroppedItem(x, y, z, 6, 1, block.data + 4);
			}
		}
		region.setBlock(x, y, z, 0, 0);
	}

	function checkLeaves(region: BlockSource, x: number, y: number, z: number, leaves: any): void {
		if (TreeCapitator.isTreeBlock(region.getBlock(x, y, z), leaves)) {
			destroyData.leaves[x+':'+y+':'+z] = true;
		}
	}

	function checkLeavesFor6Sides(region: BlockSource, x: number, y: number, z: number, leaves: any): void {
		checkLeaves(region, x-1, y, z, leaves);
		checkLeaves(region, x+1, y, z, leaves);
		checkLeaves(region, x, y, z-1, leaves);
		checkLeaves(region, x, y, z+1, leaves);
		checkLeaves(region, x, y-1, z, leaves);
		checkLeaves(region, x, y+1, z, leaves);
	}

	function isChoppingTree(player: number, region: BlockSource, coords: Vector, block: Tile): boolean {
		let item = Entity.getCarriedItem(player);
		let tree = TreeCapitator.getTreeData(block);
		if (tree && !Entity.getSneaking(player) && ToolAPI.getToolLevelViaBlock(item.id, block.id)) {
			for (let y = coords.y; y > 0; y--) {
				let block = region.getBlock(coords.x, y - 1, coords.z);
				if (TreeCapitator.isDirtTile(block.id)) {
					return true;
				}
				if (!TreeCapitator.isTreeBlock(block, tree.log)) {
					break;
				}
			}
		}
		return false;
	}

	function getTreeSize(region: BlockSource, coords: Vector, block: Tile): number {
		let tree = TreeCapitator.getTreeData(block);
		destroyData = new TreeDestroyData();
		checkLog(region, coords.x, coords.y, coords.z, tree);
		if (destroyData.hasLeaves) {
			return destroyData.logCount;
		}
		return 0;
	}

	function convertCoords(coords: string): Vector {
		let coordArray = coords.split(':');
		return {
			x: parseInt(coordArray[0]),
			y: parseInt(coordArray[1]),
			z: parseInt(coordArray[2])
		}
	}

	export function startDestroy(coords: Callback.ItemUseCoordinates, block: Tile, player: number): void {
		let region = BlockSource.getDefaultForActor(player);
		if (region && TreeCapitator.calculateDestroyTime && isChoppingTree(player, region, coords, block)) {
			let treeSize = getTreeSize(region, coords, block);
			if (treeSize > 0) {
				let item = Entity.getCarriedItem(player);
				let destroyTime = ToolAPI.getDestroyTimeViaTool(block, item, coords);
				Block.setTempDestroyTime(block.id, destroyTime * treeSize);
			}
		}
	}

	export function onDestroy(coords: Callback.ItemUseCoordinates, block: Tile, player: number): void {
		let region = BlockSource.getDefaultForActor(player);
		if (isChoppingTree(player, region, coords, block) && getTreeSize(region, coords, block) > 0) {
			let item = Entity.getCarriedItem(player);
			let toolData = ToolAPI.getToolData(item.id);
			let toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
			let enchant = ToolAPI.getEnchantExtraData(item.extra);
			let skipToolDamage = !toolData.isNative;
			if (toolData.modifyEnchant) {
				toolData.modifyEnchant(enchant, item);
			}
			let tree = TreeCapitator.getTreeData(block);
			for (let coordKey in destroyData.log) {
				let coords = convertCoords(coordKey);
				block = region.getBlock(coords.x, coords.y, coords.z);
				destroyLog(region, coords.x, coords.y, coords.z, block, tree, toolLevel, enchant);
				if (!skipToolDamage && Game.isItemSpendingAllowed(player)) {
					//@ts-ignore
					if (!(toolData.onDestroy && toolData.onDestroy(item, coords, block)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
						item.data++;
						if (toolData.isWeapon) {
							item.data++;
						}
					}
					//@ts-ignore
					if (item.data >= toolData.toolMaterial.durability) {
						if (!(toolData.onBroke && toolData.onBroke(item))) {
							item.id = toolData.brokenId;
							item.count = 1;
							item.data = 0;
							World.playSoundAtEntity(player, "random.break", 1, 1);
						}
						break;
					}
				}
				skipToolDamage = false;
			}
			Entity.setCarriedItem(player, item.id, item.count, item.data, item.extra);

			for (let i = 1; i <= tree.radius; i++) {
				let leavesToDestroy = destroyData.leaves;
				destroyData.leaves = {};
				for (let coordKey in leavesToDestroy) {
					let coords = convertCoords(coordKey);
					destroyLeaves(region, coords.x, coords.y, coords.z);
					if (i < tree.radius) {
						checkLeavesFor6Sides(region, coords.x, coords.y, coords.z, tree.leaves);
					}
				}
			}
		}
	}
}

Callback.addCallback("DestroyBlockStart", function(coords, block, player) {
	TreeLogger.startDestroy(coords, block, player);
});

Callback.addCallback("DestroyBlock", function(coords, block, player) {
	TreeLogger.onDestroy(coords, block, player);
});