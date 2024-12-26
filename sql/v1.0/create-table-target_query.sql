-- "d2r-v1.0".target_query definition

-- Drop table

-- DROP TABLE "d2r-v1.0".target_query;

CREATE TABLE "d2r-v1.0".target_query (
	id serial4 NOT NULL,
	"name" varchar(100) NULL,
	"handler" varchar(100) NULL,
	snapshot_table varchar(100) NULL,
	notes text NULL,
	CONSTRAINT target_query_pkey PRIMARY KEY (id)
);
