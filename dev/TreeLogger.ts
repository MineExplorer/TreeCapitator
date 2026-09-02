abstract class TreeLogger {
	logMap: {[key: string]: boolean} = {};
	leavesMap: {[key: string]: boolean} = {};
	nextLeaves: Vector[] = [];
	logCount = 0;
	hasLeaves = false;
	logDestroyRadius: number = TreeCapitator.logDestroyRadius;
	leavesDestroyRadius: number;
	startCoords: Vector;
	player: number;
	region: BlockSource;
	tree: TreeParams;

	constructor(startCoords: Vector, treeData: TreeParams, playerUid: number, isLocal: boolean) {
		this.startCoords = startCoords;
		this.tree = treeData;
		this.leavesDestroyRadius = treeData.radius;
		this.player = playerUid;
		this.region = isLocal ?
			BlockSource.getCurrentClientRegion() :
			BlockSource.getDefaultForActor(playerUid);
	}

	static create(startCoords: Vector, treeData: TreeParams, playerUid: number, isLocal: boolean): TreeLogger {
		switch (treeData.treeType) {
			case TreeType.Nether:
				return new NetherTreeLogger(startCoords, treeData, playerUid, isLocal);
			case TreeType.Vanilla:
				return new VanillaTreeLogger(startCoords, treeData, playerUid, isLocal);
			default:
				throw new Error("Unknown tree type: " + treeData.treeType);
		}
	}

	setDestroyTime(coords: Callback.ItemUseCoordinates, block: Tile, item: ItemInstance) {
		const treeSize = this.getTreeSize(coords);
		if (treeSize > 0) {
			const destroyTime = ToolAPI.getDestroyTimeViaTool(block, item, coords);
			Block.setTempDestroyTime(block.id, destroyTime * treeSize);
			//Game.message("Tree size: " + treeSize + ", destroyTime: " + (destroyTime * treeSize));
		}
	}

	destroyTree(coords: Callback.ItemUseCoordinates, block: Tile, item: ItemInstance): void {
		if (this.getTreeSize(coords) == 0) return;

		//Game.message("Tree size: " + this.logCount + ", logRadius: " + this.logDestroyRadius + ", leavesRadius: " + this.leavesDestroyRadius);
		const toolData = ToolAPI.getToolData(item.id);
		const enchant = ToolAPI.getEnchantExtraData(item.extra);
		if (toolData.modifyEnchant) {
			toolData.modifyEnchant(enchant, item);
		}
		this.destroyLogs(item, toolData, enchant);
		this.destroyLeaves();
	}

	getTreeSize(coords: Vector): number {
		this.checkLog(coords.x, coords.y, coords.z);
		if (this.hasLeaves) {
			return this.logCount;
		}
		return 0;
	}

	destroyLogs(item: ItemInstance, toolData: ToolAPI.ToolParams, enchant: ToolAPI.EnchantData): void {
		let skipToolDamage = !toolData.isNative;
		for (let coordKey in this.logMap) {
			const coords = this.parseCoordKey(coordKey);
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

	abstract destroyLeaves(): void;

	checkLog(x: number, y: number, z: number): void {
		if (Math.abs(x - this.startCoords.x) > this.logDestroyRadius ||
			Math.abs(z - this.startCoords.z) > this.logDestroyRadius) {
			return;
		}
		
		const coordKey = this.getCoordKey(x, y, z);
		this.logMap[coordKey] = true;
		this.logCount++;
		
		for (let xx = x - 1; xx <= x + 1; xx++)
		for (let zz = z - 1; zz <= z + 1; zz++)
		for (let yy = y; yy <= y + 1; yy++) {
			const block = this.region.getBlock(xx, yy, zz);
			if (!this.hasLeaves && TreeCapitator.isTreeBlock(block, this.tree.leaves)) {
				this.hasLeaves = true;
				continue;
			}
			const nextCoordKey = this.getCoordKey(xx, yy, zz);
			if (!this.logMap[nextCoordKey] && TreeCapitator.isTreeBlock(block, this.tree.log)) {
				this.checkLog(xx, yy, zz);
			}
		}
	}
	
	checkLeaves(x: number, y: number, z: number, nextLeaves: Vector[] = this.nextLeaves): void {
		const key = this.getCoordKey(x, y, z);
		if (!this.leavesMap[key] && TreeCapitator.isTreeBlock(this.region.getBlock(x, y, z), this.tree.leaves)) {
			this.leavesMap[key] = true;
			nextLeaves.push({x: x, y: y, z: z});
		}
	}

	checkLeavesFor6Sides(x: number, y: number, z: number): void {
		this.checkLeaves(x - 1, y, z);
		this.checkLeaves(x + 1, y, z);
		this.checkLeaves(x, y - 1, z);
		this.checkLeaves(x, y + 1, z);
		this.checkLeaves(x, y, z - 1);
		this.checkLeaves(x, y, z + 1);
	}

	getCoordKey(x: number, y: number, z: number): string {
		return x + ':' + y + ':' + z;
	}

	parseCoordKey(coordKey: string): Vector {
		const coordArray = coordKey.split(':');
		return {
			x: parseInt(coordArray[0]),
			y: parseInt(coordArray[1]),
			z: parseInt(coordArray[2])
		}
	}

	destroyBlock(x: number, y: number, z: number, block: Tile, tool: ItemInstance, enchant?: ToolAPI.EnchantData): void {
		this.region.setBlock(x, y, z, 0, 0);
		// @ts-ignore
		const dropFunc: Block.DropFunction = Block.dropFunctions[block.id];
		if (dropFunc) {
			enchant = enchant || ToolAPI.getEnchantExtraData();
			const drop = dropFunc({x: x, y: y, z: z} as any, block.id, block.data, ToolAPI.getToolLevel(tool.id), enchant, tool, this.region);
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
}
