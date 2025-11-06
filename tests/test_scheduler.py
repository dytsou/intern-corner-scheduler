"""Tests for the scheduler module"""
import pytest
from python.scheduler import compute_table_sizes, schedule


class TestComputeTableSizes:
	"""Tests for compute_table_sizes function"""
	
	def test_even_division(self):
		"""Test when participants divide evenly across tables"""
		result = compute_table_sizes(6, 2)
		assert result == [3, 3]
	
	def test_uneven_division(self):
		"""Test when participants don't divide evenly"""
		result = compute_table_sizes(7, 3)
		assert result == [3, 2, 2]
		assert sum(result) == 7
	
	def test_single_table(self):
		"""Test with single table"""
		result = compute_table_sizes(5, 1)
		assert result == [5]
	
	def test_more_tables_than_participants_should_fail(self):
		"""Test that more tables than participants is invalid"""
		# This should be caught by schedule function assertions
		with pytest.raises(AssertionError):
			schedule(num_participants=3, num_tables=5, num_rounds=1, 
			         same_once_pairs=[], never_together_pairs=[])


class TestSchedule:
	"""Tests for schedule function"""
	
	def test_basic_schedule(self):
		"""Test basic schedule generation"""
		result = schedule(
			num_participants=6,
			num_tables=2,
			num_rounds=2,
			same_once_pairs=[],
			never_together_pairs=[],
			time_limit_seconds=10
		)
		
		assert result["participants"] == 6
		assert result["tables"] == 2
		assert result["rounds"] == 2
		assert len(result["assignments"]) == 2
		assert len(result["assignments"][0]) == 2
		assert len(result["table_sizes"]) == 2
		assert sum(result["table_sizes"]) == 6
		assert result["solver_status"] in ["OPTIMAL", "FEASIBLE"]
	
	def test_hosts_fixed(self):
		"""Test that hosts are fixed at their table numbers"""
		result = schedule(
			num_participants=4,
			num_tables=2,
			num_rounds=2,
			same_once_pairs=[],
			never_together_pairs=[],
			time_limit_seconds=10
		)
		
		# Host 1 should be at table 1 in all rounds
		# Host 2 should be at table 2 in all rounds
		for r in range(2):
			assert 1 in result["assignments"][r][0]  # Table 1 (index 0)
			assert 2 in result["assignments"][r][1]  # Table 2 (index 1)
	
	def test_same_once_pairs(self):
		"""Test same-once pair constraint"""
		result = schedule(
			num_participants=6,
			num_tables=2,
			num_rounds=3,
			same_once_pairs=[(3, 5)],
			never_together_pairs=[],
			time_limit_seconds=10
		)
		
		# Check that pair (3, 5) appears together in at most one round
		together_count = 0
		for r in range(3):
			for table in result["assignments"][r]:
				if 3 in table and 5 in table:
					together_count += 1
		
		assert together_count <= 1
	
	def test_never_together_pairs(self):
		"""Test never-together pair constraint"""
		result = schedule(
			num_participants=6,
			num_tables=2,
			num_rounds=3,
			same_once_pairs=[],
			never_together_pairs=[(4, 6)],
			time_limit_seconds=10
		)
		
		# Check that pair (4, 6) never appears together
		for r in range(3):
			for table in result["assignments"][r]:
				assert not (4 in table and 6 in table)
		
		# Should have no violations
		assert len(result["never_together_violations"]) == 0
	
	def test_invalid_participants(self):
		"""Test that invalid participant IDs are filtered out"""
		result = schedule(
			num_participants=4,
			num_tables=2,
			num_rounds=1,
			same_once_pairs=[(1, 10), (2, 3)],  # 10 is invalid
			never_together_pairs=[(1, 5)],  # 5 is invalid
			time_limit_seconds=10
		)
		
		# Should only process valid pairs
		assert result["solver_status"] in ["OPTIMAL", "FEASIBLE"]
	
	def test_duplicate_pairs_normalized(self):
		"""Test that duplicate pairs are normalized"""
		result = schedule(
			num_participants=4,
			num_tables=2,
			num_rounds=1,
			same_once_pairs=[(1, 2), (2, 1), (1, 2)],  # Duplicates
			never_together_pairs=[],
			time_limit_seconds=10
		)
		
		# Should handle duplicates gracefully
		assert result["solver_status"] in ["OPTIMAL", "FEASIBLE"]
	
	def test_table_balance(self):
		"""Test that tables are balanced within each round"""
		result = schedule(
			num_participants=7,
			num_tables=3,
			num_rounds=2,
			same_once_pairs=[],
			never_together_pairs=[],
			time_limit_seconds=10
		)
		
		# Check that table sizes per round are balanced (max - min <= 1)
		for r in range(2):
			sizes = result["table_sizes_per_round"][r]
			assert max(sizes) - min(sizes) <= 1

