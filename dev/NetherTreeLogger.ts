class NetherTreeLogger extends TreeLogger {
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

	checkNeighbourLeaves(x: number, y: number, z: number, passedMap: {[key: string]: boolean}, currentLeaves: Vector[]): void {
		for (let dx = -1; dx <= 1; dx++)
		for (let dz = -1; dz <= 1; dz++)
		for (let dy = -1; dy <= 1; dy++) {
			const isVerticalPass = dx == 0 && dz == 0;
			this.checkLeaves(x + dx, y + dy, z + dz, passedMap, isVerticalPass ? currentLeaves : this.nextLeaves);
		}
	}

	destroyLeaves(): void {
		const emptyItem = {id: 0, count: 0, data: 0};
		const passedMap = {};
		for (let iteration = 1; iteration <= this.leavesDestroyRadius && this.nextLeaves.length > 0; iteration++) {
			const leavesToDestroy = this.nextLeaves;
			this.nextLeaves = [];
			for (let index = 0; index < leavesToDestroy.length; index++) {
				const coords = leavesToDestroy[index];
				const block = this.region.getBlock(coords.x, coords.y, coords.z);
				this.destroyBlock(coords.x, coords.y, coords.z, block, emptyItem);
				this.checkNeighbourLeaves(coords.x, coords.y, coords.z, passedMap, leavesToDestroy);
			}
		}
	}
}