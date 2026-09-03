class VanillaTreeLogger extends TreeLogger {
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
		if (!this.hasLeaves && TreeCapitator.isTreeBlock(block, this.tree.leaves)) {
			this.hasLeaves = true;
		}
		else if (TreeCapitator.isTreeBlock(block, this.tree.log)) {
			this.logCoords.push({x: x, y: y, z: z});
			this.checkNeighbourLogs(x, y, z, passedMap);
			return true;
		}
		return false;
	}
	
	destroyLeaves(): void {
		const emptyItem = {id: 0, count: 0, data: 0};
		const passedMap = {};
		for (let iteration = 1; iteration <= this.leavesDestroyRadius && this.nextLeaves.length > 0; iteration++) {
			const leavesToDestroy = this.nextLeaves;
			this.nextLeaves = [];
			for (let coords of leavesToDestroy) {
				const block = this.region.getBlock(coords.x, coords.y, coords.z);
				this.destroyBlock(coords.x, coords.y, coords.z, block, emptyItem);
			}
			if (iteration < this.leavesDestroyRadius) {
				for (let coords of leavesToDestroy) {
					this.checkLeavesFor6Sides(coords.x, coords.y, coords.z, passedMap);
				}
			}
		}
	}
}