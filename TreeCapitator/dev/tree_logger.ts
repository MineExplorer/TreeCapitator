class TreeLogger {
	logMap = {};
	leavesMap = {};
	logCount = 0;
	hasLeaves = false;
	startCoords: Vector;
	player: number;
	region: BlockSource;
	tree: TreeParams;

	constructor(startCoords: Vector, treeData: TreeParams, playerUid: number, isLocal: boolean) {
		this.startCoords = startCoords;
		this.tree = treeData;
		this.player = playerUid;
		this.region = isLocal ?
			BlockSource.getCurrentClientRegion() :
			BlockSource.getDefaultForActor(playerUid);
	}

	checkLog(x: number, y: number, z: number, tree: TreeParams): void {
		if (Math.abs(x - this.startCoords.x) > this.tree.radius ||
			Math.abs(z - this.startCoords.z) > this.tree.radius) {
			return;
		}
		this.logMap[x+':'+y+':'+z] = true;
		this.logCount++;
		for (let xx = x - 1; xx <= x + 1; xx++)
		for (let zz = z - 1; zz <= z + 1; zz++)
		for (let yy = y; yy <= y + 1; yy++) {
			const block = this.region.getBlock(xx, yy, zz);
			if (!this.hasLeaves && TreeCapitator.isTreeBlock(block, tree.leaves)) {
				this.hasLeaves = true;
			}
			if (!this.logMap[xx+':'+yy+':'+zz] && TreeCapitator.isTreeBlock(block, tree.log)) {
				this.checkLog(xx, yy, zz, tree);
			}
		}
	}

	destroyBlock(x: number, y: number, z: number, block: Tile, tool: ItemInstance = {id: 0, count: 0, data: 0}, enchant?: ToolAPI.EnchantData): void {
		// buggy bullshit
		/*if (NEW_CORE_API) {
			//@ts-ignore
			const drop = this.region.breakBlockForJsResult(x, y, z, tool);
			for (let item of drop.items) {
				//Game.message(`item: ${item.id}, ${item.count}, ${item.data}`)
				this.region.spawnDroppedItem(x, y, z, item.id, item.count, item.data, item.extra || null);
			}
		}*/
		this.destroyBlockLegacy(x, y, z, block, tool, enchant);
	}

	destroyBlockLegacy(x: number, y: number, z: number, block: Tile, item: ItemInstance = {id: 0, count: 0, data: 0}, enchant?: ToolAPI.EnchantData): void {
		this.region.setBlock(x, y, z, 0, 0);
		const dropFunc = Block.dropFunctions[block.id];
		if (dropFunc) {
			enchant = enchant || ToolAPI.getEnchantExtraData();
			const drop = dropFunc({x: x, y: y, z: z} as any, block.id, block.data, ToolAPI.getToolLevel(item.id), enchant, item, this.region);
			for (let item of drop) {
				this.region.spawnDroppedItem(x, y, z, item[0], item[1], item[2], item[3] || null);
			}
		} else {
			this.getVanillaDrop(x, y, z, block);
		}
	}

	getVanillaDrop(x: number, y: number, z: number, block: Tile) {
		const { id, data } = block;
		var blockDefaultDrop = [17, 162, VanillaTileID.crimson_stem, VanillaTileID.warped_stem, VanillaTileID.nether_wart_block, VanillaTileID.warped_wart_block, VanillaTileID.shroomlight]
		if (blockDefaultDrop.indexOf(id) != -1) {
			this.region.spawnDroppedItem(x, y, z, Block.convertBlockToItemId(id), 1, data);
		}
		if (id == 18) {
			if (data != 3 && Math.random() < 1/20 || data == 3 && Math.random() < 1/40) {
				this.region.spawnDroppedItem(x, y, z, 6, 1, data);
			}
			if (data == 0 && Math.random() < 1/200) {
				this.region.spawnDroppedItem(x, y, z, 260, 1, 0);
			}
		}
		if (id == 161 && Math.random() < 1/20) {
			this.region.spawnDroppedItem(x, y, z, 6, 1, data + 4);
		}
		if ((id == 18 || id == 161) && Math.random() < 1/50) {
			this.region.spawnDroppedItem(x, y, z, 280, 1, 0);
		}
	}

	checkLeaves(x: number, y: number, z: number): void {
		const key = x+':'+y+':'+z;
		if (!this.leavesMap[key] && TreeCapitator.isTreeBlock(this.region.getBlock(x, y, z), this.tree.leaves)) {
			this.leavesMap[key] = true;
		}
	}

	checkLeavesFor6Sides(x: number, y: number, z: number): void {
		this.checkLeaves(x-1, y, z);
		this.checkLeaves(x+1, y, z);
		this.checkLeaves(x, y, z-1);
		this.checkLeaves(x, y, z+1);
		this.checkLeaves(x, y-1, z);
		this.checkLeaves(x, y+1, z);
	}

	isChoppingTree(block: Tile, item: ItemInstance): boolean {
		return (!Entity.getSneaking(this.player) && ToolAPI.getToolLevelViaBlock(item.id, block.id) > 0);
	}

	getTreeSize(coords: Vector): number {
		this.checkLog(coords.x, coords.y, coords.z, this.tree);
		if (this.hasLeaves) {
			return this.logCount;
		}
		return 0;
	}

	convertCoords(coords: string): Vector {
		const coordArray = coords.split(':');
		return {
			x: parseInt(coordArray[0]),
			y: parseInt(coordArray[1]),
			z: parseInt(coordArray[2])
		}
	}

	setDestroyTime(coords: Callback.ItemUseCoordinates, block: Tile) {
		const item = Entity.getCarriedItem(this.player);
		if (this.isChoppingTree(block, item)) {
			const treeSize = this.getTreeSize(coords);
			//Game.message("Tree size: " + treeSize);
			if (treeSize > 0) {
				const destroyTime = ToolAPI.getDestroyTimeViaTool(block, item, coords);
				Block.setTempDestroyTime(block.id, destroyTime * treeSize);
			}
		}
	}

	destroyTree(coords: Callback.ItemUseCoordinates, block: Tile): void {
		const item = Entity.getCarriedItem(this.player);
		if (this.isChoppingTree(block, item) && this.getTreeSize(coords) > 0) {
			//if (NEW_CORE_API) this.region.setDestroyParticlesEnabled(false);
			const toolData = ToolAPI.getToolData(item.id);
			const enchant = ToolAPI.getEnchantExtraData(item.extra);
			if (toolData.modifyEnchant) {
				toolData.modifyEnchant(enchant, item);
			}
			this.destroyLogs(item, toolData, enchant);
			this.destroyLeaves();
		}
	}

	destroyLogs(item: ItemInstance, toolData: ToolAPI.ToolParams, enchant: ToolAPI.EnchantData): void {
		let skipToolDamage = !toolData.isNative;
		for (let coordKey in this.logMap) {
			const coords = this.convertCoords(coordKey);
			const block = this.region.getBlock(coords.x, coords.y, coords.z);
			this.destroyBlock(coords.x, coords.y, coords.z, block, item, enchant);
			this.checkLeavesFor6Sides(coords.x, coords.y, coords.z);
			if (!skipToolDamage && Game.isItemSpendingAllowed(this.player)) {
				if (!(toolData.onDestroy && toolData.onDestroy(item, coords as any, block, this.player)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
					item.data++;
					if (toolData.isWeapon) {
						item.data++;
					}
				}
				if (item.data >= toolData.toolMaterial.durability) {
					if (!(toolData.onBroke && toolData.onBroke(item))) {
						item.id = toolData.brokenId;
						item.count = 1;
						item.data = 0;
						World.playSoundAtEntity(this.player, "random.break", 1, 1);
					}
					break;
				}
			}
			skipToolDamage = false;
		}
		Entity.setCarriedItem(this.player, item.id, item.count, item.data, item.extra);
	}

	destroyLeaves() {
		for (let i = 1; i <= this.tree.radius; i++) {
			const leavesToDestroy = this.leavesMap;
			this.leavesMap = {};
			for (let coordKey in leavesToDestroy) {
				const coords = this.convertCoords(coordKey);
				const block = this.region.getBlock(coords.x, coords.y, coords.z);
				this.destroyBlock(coords.x, coords.y, coords.z, block);
			}
			if (i < this.tree.radius) {
				for (let coordKey in leavesToDestroy) {
					const coords = this.convertCoords(coordKey);
					this.checkLeavesFor6Sides(coords.x, coords.y, coords.z);
				}
			}
		}
	}

	static onStartDestroy(coords: Callback.ItemUseCoordinates, block: Tile, player: number): void {
		const tree = TreeCapitator.getTreeData(block);
		if (tree) {
			const treeLogger = new TreeLogger(coords, tree, player, Network.inRemoteWorld())
			treeLogger.setDestroyTime(coords, block);
		}
	}

	static onDestroy(coords: Callback.ItemUseCoordinates, block: Tile, player: number): void {
		const tree = TreeCapitator.getTreeData(block);
		if (tree) {
			const treeLogger = new TreeLogger(coords, tree, player, false)
			treeLogger.destroyTree(coords, block);
		}
	}
}

Callback.addCallback("DestroyBlockStart", function(coords, block, player) {
	if (TreeCapitator.calculateDestroyTime) {
		TreeLogger.onStartDestroy(coords, block, player);
	}
});

Callback.addCallback("DestroyBlock", function(coords, block, player) {
	TreeLogger.onDestroy(coords, block, player);
});