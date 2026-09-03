abstract class TreeLogger {
	logCoords: Vector[] = [];
	nextLeaves: Vector[] = [];
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

		if (Game.isDeveloperMode) {
			Game.message("[TreeCapitator] Tree size: " + this.logCoords.length + ", leavesRadius: " + this.leavesDestroyRadius);
		}
		const startTime = Debug.sysTime();
		const toolData = ToolAPI.getToolData(item.id);
		const enchant = ToolAPI.getEnchantExtraData(item.extra);
		if (toolData.modifyEnchant) {
			toolData.modifyEnchant(enchant, item);
		}
		this.collectLeafDistances();
		this.destroyLogs(item, toolData, enchant);
		this.destroyLeaves();
		const endTime = Debug.sysTime();
		if (Game.isDeveloperMode) {
			Game.message("[TreeCapitator] Tree destroyed in " + (endTime - startTime) + " ms");
		}
	}

	getTreeSize(coords: Vector): number {
		this.checkNeighbourLogs(coords.x, coords.y, coords.z, {});
		if (this.hasLeaves) {
			return this.logCoords.length;
		}
		return 0;
	}

	destroyLogs(item: ItemInstance, toolData: ToolAPI.ToolParams, enchant: ToolAPI.EnchantData): void {
		let skipToolDamage = !toolData.isNative;
		for (let coords of this.logCoords) {
			const block = this.region.getBlock(coords.x, coords.y, coords.z);
			this.destroyBlock(coords.x, coords.y, coords.z, block, item, enchant);
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

	/** @returns true if a block was marked to destroy, false otherwise */
	abstract checkLog(x: number, y: number, z: number, passedMap: {[key: string]: boolean}): boolean;
	abstract forEachLeafNeighbour(x: number, y: number, z: number, callback: (x: number, y: number, z: number) => void): void;

	checkNeighbourLogs(x: number, y: number, z: number, passedMap: {[key: string]: boolean}): void {
		for (let xx = x - 1; xx <= x + 1; xx++)
		for (let zz = z - 1; zz <= z + 1; zz++)
		for (let yy = y; yy <= y + 1; yy++) {
			this.checkLog(xx, yy, zz, passedMap);
		}
	}
	

	collectLeafDistances(): void {
		const ownLogMap: {[key: string]: boolean} = {};
		const ownLeafDistances: {[key: string]: number} = {};
		const leafCoords: {[key: string]: Vector} = {};
		let currentLeaves: Vector[] = [];
		const scanRadius = this.leavesDestroyRadius + 1;

		for (let coords of this.logCoords) {
			ownLogMap[this.getCoordKey(coords.x, coords.y, coords.z)] = true;
			this.forEachLeafNeighbour(coords.x, coords.y, coords.z, (x, y, z) => {
				this.addLeafAtDistance(x, y, z, 1, ownLeafDistances, leafCoords, currentLeaves);
			});
		}

		for (let distance = 1; distance < scanRadius && currentLeaves.length > 0; distance++) {
			const nextLeaves: Vector[] = [];
			for (let coords of currentLeaves) {
				this.forEachLeafNeighbour(coords.x, coords.y, coords.z, (x, y, z) => {
					this.addLeafAtDistance(x, y, z, distance + 1, ownLeafDistances, leafCoords, nextLeaves);
				});
			}
			currentLeaves = nextLeaves;
		}

		const foreignLogs: Vector[] = [];
		const checkedForeignLogCoords: {[key: string]: boolean} = {};
		for (let key in leafCoords) {
			const coords = leafCoords[key];
			this.forEachLeafNeighbour(coords.x, coords.y, coords.z, (x, y, z) => {
				const logKey = this.getCoordKey(x, y, z);
				if (!ownLogMap[logKey] && !checkedForeignLogCoords[logKey]) {
					checkedForeignLogCoords[logKey] = true;
					if (!TreeCapitator.isTreeBlock(this.region.getBlock(x, y, z), this.tree.log)) return;
					foreignLogs.push({x: x, y: y, z: z});
				}
			});
		}

		const foreignLeafDistances: {[key: string]: number} = {};
		currentLeaves = [];
		for (let coords of foreignLogs) {
			this.forEachLeafNeighbour(coords.x, coords.y, coords.z, (x, y, z) => {
				this.addKnownLeafAtDistance(x, y, z, 1, leafCoords, foreignLeafDistances, currentLeaves);
			});
		}
		for (let distance = 1; distance < scanRadius && currentLeaves.length > 0; distance++) {
			const nextLeaves: Vector[] = [];
			for (let coords of currentLeaves) {
				this.forEachLeafNeighbour(coords.x, coords.y, coords.z, (x, y, z) => {
					this.addKnownLeafAtDistance(x, y, z, distance + 1, leafCoords, foreignLeafDistances, nextLeaves);
				});
			}
			currentLeaves = nextLeaves;
		}

		this.nextLeaves = [];
		for (let key in leafCoords) {
			if (ownLeafDistances[key] <= this.leavesDestroyRadius &&
				(foreignLeafDistances[key] === undefined || ownLeafDistances[key] <= foreignLeafDistances[key])) {
				this.nextLeaves.push(leafCoords[key]);
			}
		}
	}

	addLeafAtDistance(x: number, y: number, z: number, distance: number, distances: {[key: string]: number}, leafCoords: {[key: string]: Vector}, nextLeaves: Vector[]): void {
		const key = this.getCoordKey(x, y, z);
		if (distances[key] === undefined && TreeCapitator.isTreeBlock(this.region.getBlock(x, y, z), this.tree.leaves)) {
			distances[key] = distance;
			leafCoords[key] = {x: x, y: y, z: z};
			nextLeaves.push(leafCoords[key]);
		}
	}

	addKnownLeafAtDistance(x: number, y: number, z: number, distance: number, leafCoords: {[key: string]: Vector}, distances: {[key: string]: number}, nextLeaves: Vector[]): void {
		const key = this.getCoordKey(x, y, z);
		if (leafCoords[key] && distances[key] === undefined) {
			distances[key] = distance;
			nextLeaves.push(leafCoords[key]);
		}
	}

	destroyLeaves(): void {
		const emptyItem = {id: 0, count: 0, data: 0};
		for (let coords of this.nextLeaves) {
			const block = this.region.getBlock(coords.x, coords.y, coords.z);
			this.destroyBlock(coords.x, coords.y, coords.z, block, emptyItem);
		}
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
