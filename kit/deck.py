"""Charts and helpers for workshop cells.

Every chart function takes the cell id first ("c3") and draws below that cell. Calling the
same function again with the same key updates the chart in place. numpy arrays are accepted
anywhere a list is.
"""
import asyncio
import json

from js import ws as _ws


def _py(x):
    if hasattr(x, "tolist"):
        return x.tolist()
    if isinstance(x, dict):
        return {str(k): _py(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_py(v) for v in x]
    if hasattr(x, "item"):
        return x.item()
    return x


def _send(cell, kind, key, **data):
    _ws.viz(cell, kind, key or kind, json.dumps(_py({k: v for k, v in data.items() if v is not None})))


def bars(cell, labels, series, title=None, key=None):
    """Grouped bar chart. series is {name: values} or a single list of values."""
    if not isinstance(series, dict):
        series = {"value": series}
    _send(cell, "bars", key, labels=[str(l) for l in labels],
          series=[{"name": k, "values": v} for k, v in series.items()], title=title)


def table(cell, head, rows, title=None, key=None):
    _send(cell, "table", key, head=[str(h) for h in head], rows=[[str(c) for c in r] for r in rows], title=title)


def line(cell, series, title=None, xlabel=None, ylabel=None, key=None):
    """Line chart. series is {name: [(x, y), ...]} or {name: [y0, y1, ...]}; replaces what was drawn."""
    norm = {}
    for name, pts in _py(series).items():
        norm[name] = [list(p) if isinstance(p, (list, tuple)) else [i, p] for i, p in enumerate(pts)]
    _send(cell, "line", key, series=norm, reset=True, title=title, xlabel=xlabel, ylabel=ylabel)


def line_push(cell, name, x, y, title=None, xlabel=None, ylabel=None, key=None):
    """Append one point to a live line chart, e.g. the loss after each epoch."""
    _send(cell, "line", key, push={"name": name, "x": x, "y": y}, title=title, xlabel=xlabel, ylabel=ylabel)


def line_reset(cell, title=None, xlabel=None, ylabel=None, key=None):
    _send(cell, "line", key, reset=True, series={}, title=title, xlabel=xlabel, ylabel=ylabel)


def scatter(cell, xy, labels=None, groups=None, title=None, key=None):
    """2-D points; labels name each point, groups colour them. Same-size updates animate."""
    _send(cell, "scatter", key, xy=xy, labels=None if labels is None else [str(l) for l in labels],
          groups=None if groups is None else [str(g) for g in groups], title=title)


def scatter3d(cell, xyz, labels=None, groups=None, title=None, key=None):
    """3-D points in a rotatable view."""
    _send(cell, "scatter3d", key, xyz=xyz, labels=None if labels is None else [str(l) for l in labels],
          groups=None if groups is None else [str(g) for g in groups], title=title)


def heatmap(cell, M, rows=None, cols=None, title=None, diverging=False, values=False, key=None):
    """Matrix as coloured cells: attention weights, confusion matrices, similarity tables."""
    _send(cell, "heatmap", key, M=M, rows=None if rows is None else [str(r) for r in rows],
          cols=None if cols is None else [str(c) for c in cols], title=title, diverging=diverging, values=values)


def image(cell, fig=None, title=None, key=None, dpi=110):
    """Show a matplotlib figure (default: the current one) as an image."""
    import base64
    import io

    import matplotlib.pyplot as plt
    fig = fig or plt.gcf()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    _send(cell, "image", key, png=base64.b64encode(buf.getvalue()).decode(), title=title)


def stopped():
    """True once the stop button was pressed; check it inside long loops."""
    return bool(_ws.stop)


async def tick():
    """Yield to the browser so charts repaint during a long loop: await deck.tick()."""
    await asyncio.sleep(0)
