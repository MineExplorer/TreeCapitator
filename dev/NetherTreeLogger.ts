const NETHER_VERTICAL_LEAVES_RADIUS = 10;

class NetherTreeLogger extends TreeLogger {
	minLeafY: number;
	maxLeafY: number;

	constructor(startCoords: Vector, treeData: TreeParams, playerUid: number, isLocal: boolean) {
		super(startCoords, treeData, playerUid, isLocal);
		this.minLeafY = startCoords.y - NETHER_VERTICAL_LEAVES_RADIUS;
		this.maxLeafY = startCoords.y + NETHER_VERTICAL_LEAVES_RADIUS;
	}

	checkLog(x: number, y: number, z: number, passedMap: {[key: string]: boolean}): boolean {
		if (Math.abs(x - this.startCoords.x) > this.logDestroyRadius ||
			Math.abs(z - this.startCoords.z) > this.logDestroyRadius) {
			return false;
		}
		
		const coordKey = this.getCoordKey(x, y, z);
		if (passedMap[coordKey]) {
			return false;
		}
		passedMap[coordKey] = true;

		const block = this.region.getBlock(x, y, z);
		if (TreeCapitator.isTreeBlock(block, this.tree.leaves)) {
			this.hasLeaves = true;
			// Shroomlights and wart blocks can replace parts of the trunk, so we need to check blocks above them.
			this.checkLog(x, y + 1, z, passedMap);
		}
		else if (TreeCapitator.isTreeBlock(block, this.tree.log)) {
			this.logCoords.push({x: x, y: y, z: z});
			this.checkNeighbourLogs(x, y, z, passedMap);
			return true;
		}
		return false;
	}

	getTreeSize(coords: Vector): number {
		const size = super.getTreeSize(coords);
		if (size > 0) {
			for (let logCoords of this.logCoords) {
				this.minLeafY = Math.min(this.minLeafY, logCoords.y - NETHER_VERTICAL_LEAVES_RADIUS);
				this.maxLeafY = Math.max(this.maxLeafY, logCoords.y + NETHER_VERTICAL_LEAVES_RADIUS);
			}
		}
		return size;
	}

	isLeafWithinBounds(x: number, y: number, z: number): boolean {
		return y >= this.minLeafY && y <= this.maxLeafY;
	}

	forEachLeafNeighbour(x: number, y: number, z: number, callback: (x: number, y: number, z: number, distance: number) => void): void {
		for (let dx = -1; dx <= 1; dx++)
		for (let dz = -1; dz <= 1; dz++)
		for (let dy = -1; dy <= 1; dy++) {
			if (dx == 0 && dy == 0 && dz == 0) continue;
			callback(x + dx, y + dy, z + dz, dx == 0 && dz == 0 ? 0 : 1);
		}
	}

	forEachForeignLeafNeighbour(x: number, y: number, z: number, callback: (x: number, y: number, z: number, distance: number) => void): void {
		for (let dx = -1; dx <= 1; dx++)
		for (let dz = -1; dz <= 1; dz++)
		for (let dy = -1; dy <= 1; dy++) {
			if (dx == 0 && dy == 0 && dz == 0) continue;
			callback(x + dx, y + dy, z + dz, 1);
		}
	}
}