from __future__ import annotations

from typing import Any, Dict

import networkx as nx


def nx_graph_to_json(graph: nx.DiGraph | nx.Graph) -> Dict[str, Any]:
    """Convert a NetworkX graph to frontend-friendly JSON.

    Output shape:
    {
      "nodes": [{"id": "...", "label": "...", "color": "..."}],
      "links": [{"source": "...", "target": "...", "label": "...", "value": 123.0}],
      "edges": [...same as links...]  # compatibility alias
    }
    """

    nodes = []
    for node, attrs in graph.nodes(data=True):
        node_id = str(node)
        nodes.append(
            {
                "id": node_id,
                "label": attrs.get("label", node_id),
                "color": attrs.get("color", "#64748B"),
            }
        )

    links = []
    for source, target, attrs in graph.edges(data=True):
        weight = float(attrs.get("weight", 0.0) or 0.0)
        label = attrs.get("label")
        if not label:
            label = f"₹{weight:,.0f}" if weight else ""

        links.append(
            {
                "source": str(source),
                "target": str(target),
                "label": label,
                "value": weight,
            }
        )

    return {
        "nodes": nodes,
        "links": links,
        "edges": links,
    }
